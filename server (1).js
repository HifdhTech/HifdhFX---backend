// ═══════════════════════════════════════════════════
//  HifdhFX Backend Server
//  Exchange with Trust — hifdhfx01@gmail.com
//  Owner: Balogun Sodiq O
// ═══════════════════════════════════════════════════
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const axios      = require('axios');
const { v4: uuidv4 } = require('uuid');
const Database   = require('better-sqlite3');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Database setup ──
const db = new Database(path.join(__dirname, 'hifdhfx.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    firstName   TEXT,
    lastName    TEXT,
    email       TEXT UNIQUE,
    phone       TEXT,
    country     TEXT,
    password    TEXT,
    role        TEXT DEFAULT 'user',
    status      TEXT DEFAULT 'active',
    conversions INTEGER DEFAULT 0,
    joined      TEXT,
    createdAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    orderId     TEXT UNIQUE,
    userId      TEXT,
    userName    TEXT,
    userEmail   TEXT,
    userPhone   TEXT,
    orderType   TEXT,
    fromCur     TEXT,
    toCur       TEXT,
    amount      REAL,
    youGet      REAL,
    rate        REAL,
    bankName    TEXT,
    acctNum     TEXT,
    acctName    TEXT,
    whatsapp    TEXT,
    paystackRef TEXT,
    status      TEXT DEFAULT 'pending',
    fulfilledAt TEXT,
    createdAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    userId      TEXT,
    type        TEXT,
    fromCur     TEXT,
    toCur       TEXT,
    amount      REAL,
    result      REAL,
    rate        TEXT,
    ref         TEXT,
    status      TEXT DEFAULT 'success',
    createdAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id          TEXT PRIMARY KEY,
    userId      TEXT,
    fromCur     TEXT,
    toCur       TEXT,
    alertType   TEXT,
    target      REAL,
    triggered   INTEGER DEFAULT 0,
    createdAt   TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ Database ready');

// ── Email Transporter ──
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  try {
    await mailer.sendMail({
      from: `"HifdhFX" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ── Email Templates ──
function emailBase(body) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0A1520;color:white;border-radius:12px;overflow:hidden">
    <div style="background:#0D1B2A;padding:24px;text-align:center;border-bottom:2px solid #C9A84C">
      <h1 style="color:#C9A84C;margin:0;font-size:24px">Hifdh<span style="color:white">FX</span></h1>
      <p style="color:#64748B;margin:4px 0 0;font-size:13px">Exchange with Trust</p>
    </div>
    <div style="padding:28px">${body}</div>
    <div style="background:#0D1B2A;padding:16px;text-align:center;border-top:1px solid #1E293B">
      <p style="color:#64748B;font-size:12px;margin:0">hifdhfx01@gmail.com · +234 812 919 0409</p>
      <p style="color:#64748B;font-size:12px;margin:4px 0 0">Opposite NYSC Camp, Kubwa, Abuja</p>
    </div>
  </div>`;
}

function newOrderEmail(order) {
  const isBuy = order.orderType === 'buy';
  return emailBase(`
    <h2 style="color:#C9A84C;margin:0 0 16px">🔔 New FX Order Received!</h2>
    <table style="width:100%;border-collapse:collapse">
      ${[
        ['Order ID',    order.orderId],
        ['Type',        `<strong style="color:${isBuy?'#22C55E':'#F59E0B'}">${isBuy?'BUY':'SELL'}</strong>`],
        ['Customer',    order.userName],
        ['Email',       order.userEmail],
        ['WhatsApp',    order.whatsapp || order.userPhone],
        ['They Send',   `<strong>${Number(order.amount).toLocaleString()} ${order.fromCur}</strong>`],
        ['They Get',    `<strong style="color:#C9A84C">${Number(order.youGet).toLocaleString()} ${order.toCur}</strong>`],
        ['Rate',        `1 ${order.fromCur} = ${order.rate} ${order.toCur}`],
        ['Bank',        order.bankName],
        ['Account No.', `<strong>${order.acctNum}</strong>`],
        ['Account Name',order.acctName],
        ['Paystack Ref',order.paystackRef || 'N/A (SELL order)'],
        ['Status',      order.status.toUpperCase()],
      ].map(([k,v]) => `
        <tr style="border-bottom:1px solid #1E293B">
          <td style="padding:10px 8px;color:#64748B;font-size:13px;width:38%">${k}</td>
          <td style="padding:10px 8px;font-size:13px">${v}</td>
        </tr>`).join('')}
    </table>
    <div style="margin-top:20px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:10px;padding:16px">
      <p style="margin:0;font-size:13px;color:#C9A84C">
        <strong>Action Required:</strong> Log into your admin dashboard and click <strong>"Fulfil Now"</strong> to process this order and notify the customer via WhatsApp.
      </p>
    </div>
    <div style="margin-top:12px;text-align:center">
      <a href="${process.env.FRONTEND_URL || 'https://your-site.netlify.app'}" 
         style="background:#C9A84C;color:#0A1520;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
        Open Admin Dashboard
      </a>
    </div>`);
}

function orderConfirmEmail(order) {
  const isBuy = order.orderType === 'buy';
  return emailBase(`
    <h2 style="color:#22C55E;margin:0 0 8px">✅ Order Received — ${order.orderId}</h2>
    <p style="color:#94A3B8;font-size:13px;margin:0 0 20px">
      Dear ${order.userName.split(' ')[0]}, your FX order has been received and is being processed.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${[
        ['Order ID',  order.orderId],
        ['Type',      isBuy ? '🟢 BUY (Purchase)' : '🟡 SELL (Liquidate)'],
        ['You Send',  `<strong>${Number(order.amount).toLocaleString()} ${order.fromCur}</strong>`],
        ['You Get',   `<strong style="color:#C9A84C">${Number(order.youGet).toLocaleString()} ${order.toCur}</strong>`],
        ['Rate',      `1 ${order.fromCur} = ${order.rate} ${order.toCur}`],
        ['Your Bank', `${order.bankName} · ${order.acctNum} · ${order.acctName}`],
        ['Status',    '<span style="color:#22C55E">Processing</span>'],
      ].map(([k,v]) => `
        <tr style="border-bottom:1px solid #1E293B">
          <td style="padding:10px 8px;color:#64748B;font-size:13px;width:38%">${k}</td>
          <td style="padding:10px 8px;font-size:13px">${v}</td>
        </tr>`).join('')}
    </table>
    ${isBuy
      ? `<div style="margin-top:20px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:16px">
          <p style="margin:0;font-size:13px">✓ Your payment has been received. We will send <strong style="color:#C9A84C">${Number(order.youGet).toLocaleString()} ${order.toCur}</strong> to your bank within <strong>30 minutes</strong>.</p>
        </div>`
      : `<div style="margin-top:20px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:16px">
          <p style="margin:0;font-size:13px">⏳ Please send <strong style="color:#C9A84C">${Number(order.amount).toLocaleString()} ${order.fromCur}</strong> to our account. Check WhatsApp for our bank details.</p>
        </div>`
    }
    <p style="color:#64748B;font-size:12px;margin-top:16px">
      Questions? WhatsApp us: <strong>+234 812 919 0409</strong>
    </p>`);
}

function fulfilledEmail(order) {
  return emailBase(`
    <h2 style="color:#22C55E;margin:0 0 8px">🎉 Transfer Completed — ${order.orderId}</h2>
    <p style="color:#94A3B8;font-size:13px;margin:0 0 20px">
      Dear ${order.userName.split(' ')[0]}, your funds have been sent successfully.
    </p>
    <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
      <p style="margin:0;font-size:13px;color:#94A3B8">Amount Sent</p>
      <p style="margin:8px 0 0;font-size:28px;font-weight:800;color:#C9A84C">${Number(order.youGet).toLocaleString()} ${order.toCur}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748B">To: ${order.bankName} · ${order.acctNum}</p>
    </div>
    <table style="width:100%;border-collapse:collapse">
      ${[
        ['Order ID',     order.orderId],
        ['Fulfilled At', order.fulfilledAt || new Date().toLocaleString()],
        ['Bank',         order.bankName],
        ['Account',      `${order.acctNum} — ${order.acctName}`],
      ].map(([k,v]) => `
        <tr style="border-bottom:1px solid #1E293B">
          <td style="padding:10px 8px;color:#64748B;font-size:13px;width:38%">${k}</td>
          <td style="padding:10px 8px;font-size:13px">${v}</td>
        </tr>`).join('')}
    </table>
    <p style="color:#64748B;font-size:12px;margin-top:16px">
      Thank you for using HifdhFX. Exchange with Trust. ⭐<br/>
      WhatsApp: <strong>+234 812 919 0409</strong> · hifdhfx01@gmail.com
    </p>`);
}

// ═══════════════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════════════

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'HifdhFX Backend', time: new Date().toISOString() });
});

// ── USERS ──
app.post('/api/users/register', (req, res) => {
  try {
    const { id, firstName, lastName, email, phone, country, password, role, joined } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    db.prepare(`INSERT INTO users (id,firstName,lastName,email,phone,country,password,role,joined)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, firstName, lastName, email, phone, country, password, role || 'user', joined);
    // Welcome email
    sendEmail(email, 'Welcome to HifdhFX! 🎉', emailBase(`
      <h2 style="color:#C9A84C">Welcome, ${firstName}! 👋</h2>
      <p style="color:#94A3B8;font-size:13px">Your HifdhFX account has been created successfully.</p>
      <p style="font-size:13px">Account ID: <strong style="color:#C9A84C">${id}</strong></p>
      <p style="color:#94A3B8;font-size:13px">You can now place FX orders, convert currencies, and track live rates.</p>
      <p style="color:#64748B;font-size:12px">Questions? WhatsApp: +234 812 919 0409</p>`));
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { phone, country, password, conversions } = req.body;
    db.prepare(`UPDATE users SET phone=COALESCE(?,phone), country=COALESCE(?,country),
                password=COALESCE(?,password), conversions=COALESCE(?,conversions)
                WHERE id=?`)
      .run(phone, country, password, conversions, req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORDERS ──
app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    order.id = uuidv4();
    db.prepare(`INSERT INTO orders
      (id,orderId,userId,userName,userEmail,userPhone,orderType,fromCur,toCur,
       amount,youGet,rate,bankName,acctNum,acctName,whatsapp,paystackRef,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(order.id, order.orderId, order.userId, order.userName, order.userEmail,
           order.userPhone, order.orderType, order.fromCur, order.toCur,
           order.amount, order.youGet, order.rate, order.bankName,
           order.acctNum, order.acctName, order.whatsapp, order.paystackRef || null,
           order.status || 'pending');

    // Email admin
    sendEmail(
      process.env.EMAIL_USER,
      `🔔 New HifdhFX Order — ${order.orderId} (${order.orderType.toUpperCase()})`,
      newOrderEmail(order)
    );
    // Email customer
    if (order.userEmail) {
      sendEmail(order.userEmail, `✅ HifdhFX Order Confirmed — ${order.orderId}`, orderConfirmEmail(order));
    }

    res.json({ success: true, id: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/user/:userId', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC').all(req.params.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:orderId/fulfil', async (req, res) => {
  try {
    const { orderId } = req.params;
    const fulfilledAt = new Date().toLocaleString('en-NG');
    db.prepare(`UPDATE orders SET status='fulfilled', fulfilledAt=? WHERE orderId=?`)
      .run(fulfilledAt, orderId);
    const order = db.prepare('SELECT * FROM orders WHERE orderId = ?').get(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Email customer
    if (order.userEmail) {
      sendEmail(order.userEmail, `🎉 HifdhFX — Your funds have been sent! (${orderId})`, fulfilledEmail(order));
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAYSTACK VERIFY ──
app.post('/api/paystack/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = response.data.data;
    if (data.status === 'success') {
      res.json({ success: true, amount: data.amount / 100, reference: data.reference, customer: data.customer });
    } else {
      res.status(400).json({ success: false, message: 'Payment not successful' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAYSTACK TRANSFER (auto-payout) ──
app.post('/api/paystack/transfer', async (req, res) => {
  try {
    const { amount, bankCode, accountNumber, accountName, reason, orderId } = req.body;
    // Step 1: Create transfer recipient
    const recipientRes = await axios.post(
      'https://api.paystack.co/transferrecipient',
      { type: 'nuban', name: accountName, account_number: accountNumber, bank_code: bankCode, currency: 'NGN' },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const recipientCode = recipientRes.data.data.recipient_code;
    // Step 2: Initiate transfer
    const transferRes = await axios.post(
      'https://api.paystack.co/transfer',
      { source: 'balance', amount: amount * 100, recipient: recipientCode, reason: reason || `HifdhFX Order ${orderId}` },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const transfer = transferRes.data.data;
    // Update order status
    if (orderId) {
      db.prepare(`UPDATE orders SET status='fulfilled', fulfilledAt=? WHERE orderId=?`)
        .run(new Date().toLocaleString('en-NG'), orderId);
    }
    res.json({ success: true, transfer });
  } catch (err) {
    console.error('Transfer error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── PAYSTACK WEBHOOK ──
app.post('/api/paystack/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Unauthorized');
  }
  const event = req.body;
  if (event.event === 'charge.success') {
    const { reference, amount, customer } = event.data;
    console.log(`💳 Payment confirmed: ${reference} — ₦${amount/100} from ${customer.email}`);
  }
  res.sendStatus(200);
});

// ── TRANSACTIONS ──
app.post('/api/transactions', (req, res) => {
  try {
    const tx = req.body;
    db.prepare(`INSERT INTO transactions (id,userId,type,fromCur,toCur,amount,result,rate,ref,status)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(uuidv4(), tx.userId, tx.type, tx.fromCur, tx.toCur, tx.amount, tx.result, tx.rate, tx.ref, tx.status||'success');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/user/:userId', (req, res) => {
  try {
    const txns = db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').all(req.params.userId);
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LIVE RATES (proxy to avoid CORS on frontend) ──
app.get('/api/rates/:base', async (req, res) => {
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${req.params.base}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch rates' });
  }
});

// ── ADMIN STATS ──
app.get('/api/admin/stats', (req, res) => {
  try {
    const totalUsers    = db.prepare('SELECT COUNT(*) as c FROM users WHERE role != "admin"').get().c;
    const activeUsers   = db.prepare('SELECT COUNT(*) as c FROM users WHERE status = "active"').get().c;
    const totalOrders   = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const pendingOrders = db.prepare('SELECT COUNT(*) as c FROM orders WHERE status IN ("pending","paid")').get().c;
    const fulfilledOrders = db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = "fulfilled"').get().c;
    res.json({ totalUsers, activeUsers, totalOrders, pendingOrders, fulfilledOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║    HifdhFX Backend Server            ║
  ║    Exchange with Trust               ║
  ║    Running on port ${PORT}              ║
  ╚══════════════════════════════════════╝
  `);
});
