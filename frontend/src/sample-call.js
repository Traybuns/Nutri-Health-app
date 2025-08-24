// POST /api/ai
fetch('/api/ai', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ prompt: 'I am 5 months pregnant. What should I eat today with local foods?' })
}).then(r=>r.json()).then(console.log);

// call backend to create payment and get link
const resp = await fetch('/api/payments/init', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({amount:1000, email:'user@example.com'})});
const j = await resp.json();
// redirect user to j.data.link or open in new tab
window.location.href = j.data.link;

fetch('/api/growth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({weight:6.5, height:65, muac:13.2})})
.then(r=>r.json()).then(console.log);

////
