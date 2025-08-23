const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSms(to, body) {
  // Ensure `to` includes country code
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
}

module.exports = { sendSms };

// Twilio webhook (accepts incoming SMS)
app.post('/api/sms/webhook', express.urlencoded({ extended: false }), (req,res) => {
  // Twilio sends body in urlencoded form; use express.urlencoded
  const from = req.body.From;
  const body = req.body.Body;
  console.log('Incoming SMS from', from, body);

  // Simple logic: if user asks about nutrition, call AI and respond
  (async () => {
    try {
      const aiReply = await askNutrition(body || ''); // reuse previous function
      // Reply using TwiML or REST API
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(aiReply);
      res.type('text/xml').send(twiml.toString());
    } catch (e) {
      console.error(e);
      res.sendStatus(500);
    }
  })();
});

const { sendSms } = require('./services/sms');
await sendSms('+2347018084869', 'Reminder: Take your MMS today. Reply HELP for details.');

