const axios = require('axios');

app.post('/api/payments/init', async (req,res) => {
  try {
    const { amount, email, tx_ref } = req.body;
    // tx_ref is unique per transaction: e.g., `nh_${Date.now()}`
    const payload = {
      tx_ref: tx_ref || `nh_${Date.now()}`,
      amount: amount.toString(),
      currency: "NGN",
      redirect_url: process.env.FLW_REDIRECT_URL || "https://your-frontend.com/payments/confirm",
      customer: { email: email || "user@example.com", phonenumber: "", name: "" },
      customizations: { title: "NutriHealth Wallet Top-up", description: "Top up wallet for NutriKit redemption" }
    };
    const resp = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
    });
    // resp.data contains 'link' to redirect user to
    res.json(resp.data);
  } catch(e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'payment init failed' });
  }
});

const crypto = require('crypto');

app.post('/api/payments/webhook', express.json({type:'application/json'}), (req,res) => {
  // Flutterwave includes a signature header: 'verif-hash' (older) or check payload
  const signature = req.headers['verif-hash'] || req.headers['x-flutterwave-signature'];
  const bodyRaw = JSON.stringify(req.body);
  const secret = process.env.FLW_WEBHOOK_SECRET;
  // compute expected hash
  const expected = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');
  if(signature !== expected) {
    console.warn('Invalid webhook signature'); return res.status(400).send('invalid signature');
  }
  const event = req.body;
  // handle successful payment
  if(event?.data?.status === 'successful' || event?.event === 'charge.completed') {
    const txRef = event.data.tx_ref || event.data?.flw_ref;
    const amount = event.data.amount || event.data?.charged_amount;
    // update wallet in DB: credit user's wallet with amount
    // TODO: find user by txRef in DB and mark payment confirmed
    console.log('payment confirmed', txRef, amount);
  }
  res.json({ received: true });
});

app.post('/api/payouts/send', async (req,res) => {
  const { recipient_phone, amount, narration } = req.body;
  try {
    const payload = {
      account_bank: "044", // bank code for recipients if bank transfer; change per method
      account_number: recipient_phone, // for mobile wallets, method differs
      amount: amount,
      narration: narration || "NutriKit payout",
      currency: "NGN",
      reference: `payout_${Date.now()}`,
      callback_url: process.env.FLW_PAYOUT_CALLBACK
    };
    const r = await axios.post('https://api.flutterwave.com/v3/transfers', payload, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
    });
    res.json(r.data);
  } catch(e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'payout failed' });
  }
});
