// ═══════════════════════════════════════════════════
//  HifdhFX Backend — Production Ready v2
//  Exchange with Trust
//  Owner: Balogun Sodiq O
//  Email: hifdhfx01@gmail.com
//  WhatsApp: +234 812 919 0409
// ═══════════════════════════════════════════════════
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── JSON File Database (zero compilation, works on all servers) ──
const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const blank = { users:[], orders:[], transactions:[], alerts:[] };
    fs.writeFileSync(DB_PATH, JSON.stringify(blank, null, 2));
    return blank;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch(e) {
    return { users:[], orders:[], transactions:[], alerts:[] };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

console.log('✅ HifdhFX Database ready');

// ── Email (only runs if Gmail App Password is set) ──
async function sendEmail(to, subject, html) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass || pass === 'skip' || pass === 'placeholder' || pass.length < 10) {
    console.log(`📧 Email skipped (no credentials yet): ${subject}`);
    return false;
  }
  try {
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
    await transport.sendMail({ from: `"HifdhFX" <${user}>`, to, subject, html });
    console.log(`✅ Email sent → ${to}`);
    return true;
  } catch(err) {
    console.error('❌ Email error:', err.message);
    return false;
  }
}

// ── Email Templates ──
const emailWrap = body => `
<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f0f4f8;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:auto;background:#0A1520;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.3)">
  <div style="background:#0D1B2A;padding:28px 32px;text-align:center;border-bottom:2px solid #C9A84C">
    <h1 style="color:#C9A84C;margin:0;font-size:26px;letter-spacing:-0.5px">HifdhFX</h1>
    <p style="color:#64748B;margin:4px 0 0;font-size:13px">Exchange with Trust</p>
  </div>
  <div style="padding:32px;color:#F5F0E8">${body}</div>
  <div style="background:#0D1B2A;padding:20px 32px;text-align:center;border-top:1px solid rgba(201,168,76,.15)">
    <p style="color:#64748B;font-size:12px;margin:0">📧 hifdhfx01@gmail.com &nbsp;·&nbsp; 📱 +234 812 919 0409</p>
    <p style="color:#64748B;font-size:12px;margin:6px 0 0">📍 Opposite NYSC Orientation Camp, Kubwa, Abuja</p>
  </div>
</div></body></html>`;

const row = (label, value) => `
  <tr>
    <td style="padding:10px 12px;color:#8A9BB0;font-size:13px;width:40%;border-bottom:1px solid rgba(201,168,76,.08)">${label}</td>
    <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid rgba(201,168,76,.08)">${value||'—'}</td>
  </tr>`;

function adminNewOrderEmail(o) {
  const isBuy = o.orderType === 'buy';
  return emailWrap(`
    <h2 style="color:#C9A84C;margin:0 0 6px">🔔 New FX Order!</h2>
    <p style="color:#8A9BB0;font-size:13px;margin:0 0 20px">A customer just placed a ${isBuy ? 'BUY' : 'SELL'} order. Process it now.</p>
    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden">
      ${row('Order ID', `<strong style="color:#C9A84C">${o.orderId}</strong>`)}
      ${row('Type', `<strong style="color:${isBuy?'#22C55E':'#F59E0B'}">${isBuy?'🟢 BUY':'🟡 SELL'}</strong>`)}
      ${row('Customer', o.userName)}
      ${row('Email', o.userEmail)}
      ${row('WhatsApp', o.whatsapp || o.userPhone)}
      ${row('They Send', `<strong>${Number(o.amount||0).toLocaleString()} ${o.fromCur}</strong>`)}
      ${row('They Receive', `<strong style="color:#C9A84C">${Number(o.youGet||0).toLocaleString()} ${o.toCur}</strong>`)}
      ${row('Rate', `1 ${o.fromCur} = ${o.rate} ${o.toCur}`)}
      ${row('Their Bank', o.bankName)}
      ${row('Account No.', `<strong>${o.acctNum}</strong>`)}
      ${row('Account Name', o.acctName)}
      ${row('Payment Ref', o.paystackRef || o.flwRef || 'N/A')}
      ${row('Status', `<span style="color:#F59E0B">${(o.status||'pending').toUpperCase()}</span>`)}
    </table>
    <div style="margin-top:20px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:12px;padding:16px">
      <p style="margin:0;font-size:13px;color:#C9A84C">
        ⚡ <strong>Action Required:</strong> Open your admin dashboard → tap <strong>"Fulfil Now"</strong> to process and notify the customer.
      </p>
    </div>`);
}

function customerOrderEmail(o) {
  const isBuy = o.orderType === 'buy';
  return emailWrap(`
    <h2 style="color:#22C55E;margin:0 0 6px">✅ Order Confirmed!</h2>
    <p style="color:#8A9BB0;font-size:13px;margin:0 0 20px">
      Dear ${(o.userName||'Customer').split(' ')[0]}, your FX order has been received and is being processed.
    </p>
    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden">
      ${row('Order ID', `<strong style="color:#C9A84C">${o.orderId}</strong>`)}
      ${row('You Send', `<strong>${Number(o.amount||0).toLocaleString()} ${o.fromCur}</strong>`)}
      ${row('You Receive', `<strong style="color:#C9A84C">${Number(o.youGet||0).toLocaleString()} ${o.toCur}</strong>`)}
      ${row('Exchange Rate', `1 ${o.fromCur} = ${o.rate} ${o.toCur}`)}
      ${row('To Your Bank', `${o.bankName} · ${o.acctNum} · ${o.acctName}`)}
      ${row('Fee', '<span style="color:#22C55E">FREE ✓</span>')}
      ${row('Status', '<span style="color:#F59E0B">Processing</span>')}
    </table>
    <div style="margin-top:20px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:16px;font-size:13px">
      ${isBuy
        ? '✓ Your payment has been received. We will send your funds within <strong>30 minutes</strong>.'
        : '⏳ Please send your funds to our account. Check WhatsApp for our bank details.'}
    </div>
    <p style="color:#64748B;font-size:12px;margin-top:16px">
      Questions? WhatsApp us: <strong style="color:#25D366">+234 812 919 0409</strong>
    </p>`);
}

function customerFulfilledEmail(o) {
  return emailWrap(`
    <h2 style="color:#22C55E;margin:0 0 6px">🎉 Transfer Completed!</h2>
    <p style="color:#8A9BB0;font-size:13px;margin:0 0 20px">
      Dear ${(o.userName||'Customer').split(' ')[0]}, your funds have been sent successfully.
    </p>
    <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px">
      <p style="margin:0;color:#8A9BB0;font-size:12px">Amount Sent</p>
      <p style="margin:8px 0 0;font-size:32px;font-weight:800;color:#C9A84C">${Number(o.youGet||0).toLocaleString()} ${o.toCur}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#8A9BB0">→ ${o.bankName} · ${o.acctNum}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden">
      ${row('Order ID', o.orderId)}
      ${row('Fulfilled At', o.fulfilledAt)}
      ${row('Bank', o.bankName)}
      ${row('Account', `${o.acctNum} — ${o.acctName}`)}
    </table>
    <p style="color:#8A9BB0;font-size:13px;margin-top:20px;line-height:1.6">
      Thank you for using <strong style="color:#C9A84C">HifdhFX</strong>. Exchange with Trust. ⭐<br/>
      We look forward to serving you again.<br/>
      <span style="color:#64748B;font-size:12px">WhatsApp: +234 812 919 0409 · hifdhfx01@gmail.com</span>
    </p>`);
}

// ═══════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════

// Health
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', app:'HifdhFX Backend v2', time:new Date().toISOString(), port:PORT });
});

// ── USERS ──
app.post('/api/users/register', async (req, res) => {
  try {
    const db = loadDB();
    const u = req.body;
    if (!u.email || !u.password) return res.status(400).json({ error:'Email and password required' });
    if (db.users.find(x => x.email === u.email)) return res.status(409).json({ error:'Email already registered' });
    u.createdAt = new Date().toISOString();
    u.status = u.status || 'active';
    u.role = u.role || 'user';
    u.conversions = 0;
    db.users.push(u);
    saveDB(db);
    sendEmail(u.email, 'Welcome to HifdhFX! 🎉', emailWrap(`
      <h2 style="color:#C9A84C">Welcome, ${u.firstName}! 👋</h2>
      <p style="color:#8A9BB0">Your HifdhFX account is ready. Start converting currencies and placing FX orders today.</p>
      <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden">
        ${row('Account ID', `<strong style="color:#C9A84C">${u.id}</strong>`)}
        ${row('Name', `${u.firstName} ${u.lastName}`)}
        ${row('Email', u.email)}
        ${row('Country', u.country)}
      </table>
      <p style="color:#64748B;font-size:12px;margin-top:16px">
        Questions? WhatsApp: <strong style="color:#25D366">+234 812 919 0409</strong>
      </p>`));
    res.json({ success:true, id:u.id });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.post('/api/users/login', (req, res) => {
  try {
    const db = loadDB();
    const { email, password } = req.body;
    const u = db.users.find(x => x.email===email && x.password===password);
    if (!u) return res.status(401).json({ error:'Invalid email or password' });
    res.json({ success:true, user:u });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.get('/api/users', (req, res) => {
  try {
    const db = loadDB();
    res.json(db.users.filter(u => u.role !== 'admin'));
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const db = loadDB();
    const idx = db.users.findIndex(u => u.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error:'User not found' });
    db.users[idx] = { ...db.users[idx], ...req.body, id:req.params.id };
    saveDB(db);
    res.json({ success:true, user:db.users[idx] });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── ORDERS ──
app.post('/api/orders', async (req, res) => {
  try {
    const db = loadDB();
    const order = {
      ...req.body,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      status: req.body.status || 'pending',
    };
    db.orders.push(order);
    saveDB(db);
    // Email admin
    await sendEmail(
      process.env.EMAIL_USER,
      `🔔 New HifdhFX Order — ${order.orderId} [${(order.orderType||'').toUpperCase()}]`,
      adminNewOrderEmail(order)
    );
    // Email customer
    if (order.userEmail) {
      await sendEmail(order.userEmail, `✅ HifdhFX Order Confirmed — ${order.orderId}`, customerOrderEmail(order));
    }
    res.json({ success:true, id:order.id });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.get('/api/orders', (req, res) => {
  try {
    const db = loadDB();
    res.json([...db.orders].reverse());
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.get('/api/orders/user/:userId', (req, res) => {
  try {
    const db = loadDB();
    res.json(db.orders.filter(o => o.userId===req.params.userId).reverse());
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.put('/api/orders/:orderId/fulfil', async (req, res) => {
  try {
    const db = loadDB();
    const idx = db.orders.findIndex(o => o.orderId===req.params.orderId);
    if (idx < 0) return res.status(404).json({ error:'Order not found' });
    db.orders[idx].status = 'fulfilled';
    db.orders[idx].fulfilledAt = new Date().toLocaleString('en-NG');
    saveDB(db);
    const order = db.orders[idx];
    if (order.userEmail) {
      await sendEmail(
        order.userEmail,
        `🎉 HifdhFX — Your funds have been sent! (${order.orderId})`,
        customerFulfilledEmail(order)
      );
    }
    res.json({ success:true, order });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.put('/api/orders/:orderId/status', (req, res) => {
  try {
    const db = loadDB();
    const idx = db.orders.findIndex(o => o.orderId===req.params.orderId);
    if (idx < 0) return res.status(404).json({ error:'Order not found' });
    db.orders[idx].status = req.body.status;
    saveDB(db);
    res.json({ success:true, order:db.orders[idx] });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── PAYSTACK VERIFY ──
app.post('/api/paystack/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error:'Reference required' });
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers:{ Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = response.data.data;
    if (data.status === 'success') {
      // Update matching order to paid
      const db = loadDB();
      const idx = db.orders.findIndex(o => o.paystackRef===reference);
      if (idx >= 0) { db.orders[idx].status='paid'; saveDB(db); }
      res.json({ success:true, amount:data.amount/100, reference:data.reference, email:data.customer.email });
    } else {
      res.status(400).json({ success:false, message:'Payment not confirmed' });
    }
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── FLUTTERWAVE VERIFY ──
app.post('/api/flutterwave/verify', async (req, res) => {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ error:'Transaction ID required' });
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers:{ Authorization:`Bearer ${process.env.FLW_SECRET_KEY}` } }
    );
    const data = response.data.data;
    if (data.status === 'successful') {
      const db = loadDB();
      const idx = db.orders.findIndex(o => o.flwRef===String(transaction_id));
      if (idx >= 0) { db.orders[idx].status='paid'; saveDB(db); }
      res.json({ success:true, amount:data.amount, currency:data.currency, reference:data.flw_ref });
    } else {
      res.status(400).json({ success:false, message:'Payment not confirmed' });
    }
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── PAYSTACK WEBHOOK ──
app.post('/api/webhooks/paystack', express.raw({ type:'*/*' }), (req, res) => {
  try {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY||'')
      .update(req.body).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.sendStatus(401);
    const event = JSON.parse(req.body);
    if (event.event === 'charge.success') {
      console.log(`💳 Paystack payment confirmed: ${event.data.reference} — ₦${event.data.amount/100}`);
    }
    res.sendStatus(200);
  } catch(err) { res.sendStatus(200); }
});

// ── FLUTTERWAVE WEBHOOK ──
app.post('/api/webhooks/flutterwave', (req, res) => {
  const secretHash = process.env.FLW_WEBHOOK_HASH || '';
  const signature = req.headers['verif-hash'];
  if (signature !== secretHash) return res.sendStatus(401);
  const payload = req.body;
  if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
    console.log(`⚡ Flutterwave payment confirmed: ${payload.data.id} — ${payload.data.amount} ${payload.data.currency}`);
  }
  res.sendStatus(200);
});

// ── TRANSACTIONS ──
app.post('/api/transactions', (req, res) => {
  try {
    const db = loadDB();
    db.transactions.push({ ...req.body, id:uuidv4(), createdAt:new Date().toISOString() });
    saveDB(db);
    res.json({ success:true });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

app.get('/api/transactions/user/:userId', (req, res) => {
  try {
    const db = loadDB();
    res.json(db.transactions.filter(t => t.userId===req.params.userId).reverse().slice(0,50));
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── LIVE RATES PROXY ──
app.get('/api/rates/:base', async (req, res) => {
  try {
    const r = await axios.get(`https://api.exchangerate-api.com/v4/latest/${req.params.base}`);
    res.json(r.data);
  } catch(err) { res.status(500).json({ error:'Could not fetch rates' }); }
});

// ── ADMIN STATS ──
app.get('/api/admin/stats', (req, res) => {
  try {
    const db = loadDB();
    const users  = db.users.filter(u => u.role !== 'admin');
    const orders = db.orders;
    const today  = new Date().toLocaleDateString('en-GB');
    res.json({
      totalUsers:      users.length,
      activeUsers:     users.filter(u => u.status==='active').length,
      countries:       [...new Set(users.map(u=>u.country).filter(Boolean))].length,
      joinedToday:     users.filter(u => u.joined===today).length,
      totalOrders:     orders.length,
      pendingOrders:   orders.filter(o => ['pending','paid'].includes(o.status)).length,
      fulfilledOrders: orders.filter(o => o.status==='fulfilled').length,
      totalRevenue:    orders.filter(o=>o.orderType==='buy').reduce((s,o)=>s+(o.amount||0),0),
    });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   HifdhFX Backend Server v2  ✅          ║
║   Exchange with Trust                    ║
║   Owner: Balogun Sodiq O                 ║
║   hifdhfx01@gmail.com                   ║
║   Port: ${PORT}                             ║
╚══════════════════════════════════════════╝`);
});
