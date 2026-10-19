import type { NextApiRequest, NextApiResponse } from 'next';

const YOUPI_PG_API_URL = 'http://localhost:6100'; // Default YouPI-PG API port

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Initiate Payment
    try {
      const { orderId, amount, customer } = req.body;

      const youpiReqBody = {
        merchantId: 'YOUR_MERCHANT_ID', // Replace with your actual Merchant ID from YouPI-PG admin
        amount,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        orderId,
        currency: 'INR',
      };

      const youpiRes = await fetch(`${YOUPI_PG_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer YOUR_YOUPI_API_KEY`, // Replace with your YouPI-PG API Key
        },
        body: JSON.stringify(youpiReqBody),
      });

      const youpiData = await youpiRes.json();

      if (youpiRes.ok) {
        res.status(200).json({
          success: true,
          paymentId: youpiData.paymentId,
          iframeUrl: `http://localhost:7000/checkout?paymentId=${youpiData.paymentId}`, // Default YouPI-PG checkout port
        });
      } else {
        res.status(youpiRes.status).json({ success: false, message: youpiData.message || 'Failed to initiate payment' });
      }
    } catch (error) {
      console.error('YouPI Initiation Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  } else if (req.method === 'GET') {
    // Get Payment Status
    try {
      const { paymentId } = req.query;

      const youpiRes = await fetch(`${YOUPI_PG_API_URL}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer YOUR_YOUPI_API_KEY`, // Replace with your YouPI-PG API Key
        },
      });

      const youpiData = await youpiRes.json();

      if (youpiRes.ok) {
        res.status(200).json({ success: true, status: youpiData.status });
      } else {
        res.status(youpiRes.status).json({ success: false, message: youpiData.message || 'Failed to get payment status' });
      }
    } catch (error) {
      console.error('YouPI Status Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}