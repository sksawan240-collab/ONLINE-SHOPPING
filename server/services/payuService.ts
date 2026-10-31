import crypto from 'crypto';

/**
 * PayU India Hosted Checkout. Docs: https://docs.payu.in/
 * PROD pay URL: https://secure.payu.in/_payment
 * TEST pay URL: https://test.payu.in/_payment
 */

export type PayuEnv = 'production' | 'test';

export function getPayuConfig() {
  const raw = (process.env.PAYU_ENV || 'test').toLowerCase();
  const env: PayuEnv = raw === 'production' || raw === 'prod' || raw === 'live' ? 'production' : 'test';
  return {
    env,
    merchantKey: (process.env.PAYU_MERCHANT_KEY || '').trim(),
    merchantSalt: (process.env.PAYU_MERCHANT_SALT || '').trim(),
    frontendUrl: (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
    backendUrl: (process.env.BACKEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  };
}

export function isPayuConfigured(): boolean {
  const c = getPayuConfig();
  return !!(c.merchantKey && c.merchantSalt);
}

export function payuPaymentUrl(): string {
  return getPayuConfig().env === 'production'
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment';
}

export function payuVerifyUrl(): string {
  return getPayuConfig().env === 'production'
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';
}

export function formatPayuAmount(n: number): string {
  return Number(n).toFixed(2);
}

function sha512Hex(input: string): string {
  return crypto.createHash('sha512').update(input, 'utf-8').digest('hex');
}

/** Request hash: key|txnid|amount|productinfo|firstname|email|udf1..udf10|SALT */
export function generatePayuRequestHash(p: {
  key: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string; salt: string;
  udf1?: string; udf2?: string; udf3?: string; udf4?: string; udf5?: string;
  udf6?: string; udf7?: string; udf8?: string; udf9?: string; udf10?: string;
}): string {
  const u = [p.udf1 ?? '', p.udf2 ?? '', p.udf3 ?? '', p.udf4 ?? '', p.udf5 ?? '', p.udf6 ?? '', p.udf7 ?? '', p.udf8 ?? '', p.udf9 ?? '', p.udf10 ?? ''];
  const seq = [p.key, p.txnid, p.amount, p.productinfo, p.firstname, p.email, ...u, p.salt].join('|');
  return sha512Hex(seq);
}

/** Response reverse-hash validation. */
export function verifyPayuResponseHash(resp: Record<string, any>, salt: string, key: string): boolean {
  try {
    const status = String(resp.status ?? '');
    const email = String(resp.email ?? '');
    const firstname = String(resp.firstname ?? '');
    const productinfo = String(resp.productinfo ?? '');
    const amount = String(resp.amount ?? '');
    const txnid = String(resp.txnid ?? '');
    const posted = String(resp.hash ?? '');
    if (!posted || !txnid) return false;
    const add = resp.additionalCharges;
    let seq: string;
    if (add !== undefined && add !== null && String(add).trim() !== '') {
      seq = [String(add), salt, status, '', '', '', '', '', '', '', '', '', '', email, firstname, productinfo, amount, txnid, key].join('|');
    } else {
      seq = [salt, status, '', '', '', '', '', '', '', '', '', '', email, firstname, productinfo, amount, txnid, key].join('|');
    }
    const calc = sha512Hex(seq);
    const a = Buffer.from(calc.toLowerCase());
    const b = Buffer.from(posted.toLowerCase());
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

/** Command hash: sha512(key|command|var1|salt) */
export function generatePayuCommandHash(key: string, command: string, var1: string, salt: string): string {
  return sha512Hex([key, command, var1, salt].join('|'));
}

export async function verifyPaymentWithPayu(txnid: string): Promise<{ ok: boolean; status?: string; transactionDetails?: any; raw?: any; error?: string }> {
  const cfg = getPayuConfig();
  if (!cfg.merchantKey || !cfg.merchantSalt) return { ok: false, error: 'PayU credentials not configured.' };
  const command = 'verify_payment';
  const hash = generatePayuCommandHash(cfg.merchantKey, command, txnid, cfg.merchantSalt);
  const body = new URLSearchParams();
  body.append('key', cfg.merchantKey);
  body.append('command', command);
  body.append('var1', txnid);
  body.append('hash', hash);
  try {
    const res = await fetch(payuVerifyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const raw: any = await res.json().catch(() => null);
    if (!raw) return { ok: false, error: 'Empty response from PayU verify API.' };
    const details = raw.transaction_details?.[txnid];
    if (!details) return { ok: false, raw, error: raw.msg || 'Transaction not found at PayU.' };
    return { ok: true, status: String(details.status || '').toLowerCase(), transactionDetails: details, raw };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'PayU verify request failed.' };
  }
}

export function safePayuLog(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (['hash', 'salt', 'key'].includes(k.toLowerCase())) {
      const s = String(v || '');
      out[k] = s ? s.slice(0, 6) + '...' : '';
    } else if (k.toLowerCase().includes('cvv') || k.toLowerCase().includes('card')) {
      out[k] = '[REDACTED]';
    } else out[k] = v;
  }
  return out;
}

