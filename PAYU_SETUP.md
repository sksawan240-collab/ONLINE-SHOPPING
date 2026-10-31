# PayU India Payment Gateway — PRODUCTION SETUP
# ================================
# 1. Get credentials from https://payu.in → your merchant dashboard.
#    - TEST key/salt: dashboard toggle "Test Mode".
#    - LIVE key/salt: after KYC + bank activation ("Production" section).
# 2. Set these as environment variables in your deployment (Render/Railway/VPS):
#      PAYU_ENV=production
#      PAYU_MERCHANT_KEY=<live key from dashboard>
#      PAYU_MERCHANT_SALT=<live salt from dashboard>
#      FRONTEND_URL=https://your-store-domain.com
#      BACKEND_URL=https://your-api-domain-or-same.com
# 3. For local testing with TEST credentials:
#      PAYU_ENV=test
# 4. In the PayU dashboard, register success/failure URLs:
#      Success & Failure URL: <BACKEND_URL>/api/payu/callback
#      (backend redirects the shopper to /payment/success|failed|pending)
# 5. REQUIREMENTS for live payments:
#    - HTTPS public BACKEND_URL (PayU cannot reach localhost).
#    - Activated production merchant account (KYC approved).
#    - UPI/Cards/NetBanking enabled on your PayU account (contact your KAM).
# 6. NEVER commit real keys to git. Keep them only in deployment env vars.
# 7. Verify a live ₹1–₹10 test order, then check Admin → PayU Payments.
