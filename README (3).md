# HifdhFX Backend Server v2

> **Exchange with Trust** — Production-ready Node.js backend for the HifdhFX currency exchange platform.

**Owner:** Balogun Sodiq O  
**Email:** hifdhfx01@gmail.com  
**WhatsApp:** +234 812 919 0409  
**Location:** Opposite NYSC Orientation Camp, Kubwa, Abuja

---

## What This Server Does

The HifdhFX backend powers the following:

- User registration and login
- FX order creation, tracking, and fulfilment
- Payment verification for both **Paystack** and **Flutterwave**
- Webhook handling for real-time payment events
- Transaction history per user
- Live exchange rate proxying
- Admin dashboard statistics
- Automated email notifications (order confirmed, funds sent)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | JSON file (`db.json`) — zero setup |
| Email | Nodemailer (Gmail) |
| Payments | Paystack + Flutterwave |
| Rates | exchangerate-api.com |
| Hosting | Railway.app |

---

## Project Structure

```
hifdh-backend/
├── server.js        ← Main server (all routes)
├── package.json     ← Dependencies and start script
├── .env             ← Secret keys (never commit this)
├── .env.example     ← Template for env variables
├── .gitignore       ← Keeps .env and db.json out of Git
└── db.json          ← Auto-created on first run (your database)
```

---

## Environment Variables

Create a `.env` file in the project root with these values:

```env
# Server
PORT=3000

# Paystack
PAYSTACK_SECRET_KEY=YOUR-PAYSTACK-SECRET-KEY-HERE

# Flutterwave
FLW_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxx-X
FLW_WEBHOOK_HASH=Sodiq@19901

# Email (Gmail App Password — not your regular password)
EMAIL_USER=hifdhfx01@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

> ⚠️ **Never commit `.env` to GitHub.** It is already listed in `.gitignore`.

### Setting Variables on Railway

1. Open your Railway project
2. Click your service → **Variables** tab
3. Add each key and value one by one
4. Railway restarts automatically after saving

---

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status, version, and current time. Use this to confirm the server is running.

---

### Users

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/register` | Register a new user |
| POST | `/api/users/login` | Log in an existing user |

**Register body:**
```json
{
  "firstName": "Sodiq",
  "lastName": "Balogun",
  "email": "user@example.com",
  "password": "securepassword",
  "phone": "08129190409",
  "country": "Nigeria"
}
```

**Login body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

---

### Orders

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create a new FX order |
| GET | `/api/orders` | Get all orders (admin) |
| GET | `/api/orders/user/:userId` | Get orders for a specific user |
| PUT | `/api/orders/:orderId/fulfil` | Mark order as fulfilled + email customer |
| PUT | `/api/orders/:orderId/status` | Update order status manually |

**Create order body example:**
```json
{
  "orderId": "HFX-001",
  "orderType": "buy",
  "fromCur": "NGN",
  "toCur": "USD",
  "amount": 850000,
  "youGet": 500,
  "rate": 1700,
  "bankName": "GTBank",
  "acctNum": "0123456789",
  "acctName": "John Doe",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "whatsapp": "08123456789",
  "paystackRef": "HFX-1234567890",
  "status": "paid"
}
```

When an order is created, the server automatically:
- Emails the **admin** with full order details
- Emails the **customer** with their order confirmation

When an order is fulfilled, the server automatically:
- Emails the **customer** to confirm their funds have been sent

---

### Payment Verification

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/paystack/verify` | Verify a Paystack payment |
| POST | `/api/flutterwave/verify` | Verify a Flutterwave payment |

**Paystack verify body:**
```json
{ "reference": "HFX-1234567890-ABCDE" }
```

**Flutterwave verify body:**
```json
{ "transaction_id": "1234567" }
```

Both endpoints update the matching order status to `paid` on success.

---

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/webhooks/paystack` | Receives Paystack payment events |
| POST | `/api/webhooks/flutterwave` | Receives Flutterwave payment events |

Set these URLs in your payment dashboards:

- **Paystack:** Settings → Webhooks → `https://your-railway-url/api/webhooks/paystack`
- **Flutterwave:** Settings → Webhooks → `https://your-railway-url/api/webhooks/flutterwave`

The Flutterwave webhook uses the `FLW_WEBHOOK_HASH` env variable to verify authenticity.

---

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transactions` | Save a transaction record |
| GET | `/api/transactions/user/:userId` | Get last 50 transactions for a user |

---

### Live Rates

```
GET /api/rates/:base
```

Example: `GET /api/rates/USD` — returns live exchange rates for all currencies relative to USD.

This is a proxy to `exchangerate-api.com` so your frontend always gets fresh rates without exposing any API key.

---

### Admin Stats

```
GET /api/admin/stats
```

Returns:

```json
{
  "totalUsers": 42,
  "activeUsers": 40,
  "countries": 7,
  "joinedToday": 3,
  "totalOrders": 120,
  "pendingOrders": 5,
  "fulfilledOrders": 115,
  "totalRevenue": 42500000
}
```

---

## Deploying to Railway

### First Time Setup

1. Push this folder to GitHub (private repo is fine)
2. Go to [railway.app](https://railway.app) → **New Project**
3. Click **Deploy from GitHub repo**
4. Select `HifdhTech/Hifdh--backend`
5. Railway detects Node.js automatically and runs `npm start`

### Add Environment Variables

Go to your Railway project → Service → **Variables** tab and add all variables from the `.env` section above.

### Get Your Live URL

Railway → your service → **Settings** → **Domains** → Generate Domain.

Your backend will be live at something like:
```
https://hifdh-backend-production.up.railway.app
```

Use this URL as the base for all API calls from your HifdhFX frontend.

---

## Running Locally

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# (then fill in your actual keys)

# Start the server
npm start
```

Server starts on `http://localhost:3000`

Test it:
```
GET http://localhost:3000/api/health
```

---

## Database

The server uses a simple JSON file (`db.json`) as its database. It is created automatically on first run with this structure:

```json
{
  "users": [],
  "orders": [],
  "transactions": [],
  "alerts": []
}
```

> ⚠️ `db.json` is listed in `.gitignore` and should never be committed to GitHub — it contains real customer data.

> ⚠️ Railway's file system resets on redeploy. For a permanent database, consider upgrading to Railway's PostgreSQL plugin or Firebase Firestore in a future version.

---

## Email Setup

Emails are sent via Gmail using a **Google App Password** (not your regular Gmail password).

To generate an App Password:
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification → App Passwords
3. Choose **Mail** and generate
4. Copy the 16-character password into `EMAIL_PASS` in your `.env`

If `EMAIL_PASS` is missing or invalid, emails are silently skipped — the server still works normally.

---

## Support

**WhatsApp:** +234 812 919 0409  
**Email:** hifdhfx01@gmail.com  
**Website:** [hifdhfxappi.netlify.app](https://hifdhfxappi.netlify.app)

---

*HifdhFX — Exchange with Trust*
