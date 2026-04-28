# HifdhFX Backend Server
## Exchange with Trust — Deployment Guide

---

## 📋 STEP BY STEP — Deploy to Railway.app

### STEP 1 — Upload to GitHub
1. Open GitHub.com — log in as **HifdhTech**
2. Click **"New repository"** (green button)
3. Name it: `hifdhfx-backend`
4. Set to **Private** ✅
5. Click **"Create repository"**
6. Upload all files in this folder to the repo

### STEP 2 — Connect to Railway
1. Go to **railway.app** — log in
2. Click **"New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select `HifdhTech/hifdhfx-backend`
5. Railway will detect Node.js automatically
6. Click **Deploy** ✅

### STEP 3 — Add Environment Variables (MOST IMPORTANT)
In Railway dashboard → Your project → **Variables** tab, add these one by one:

| Variable | Value |
|---|---|
| `PAYSTACK_SECRET_KEY` | Your sk_live_... key |
| `PAYSTACK_PUBLIC_KEY` | pk_live_6406a29535396f3d24d0387939f2f781cf471ed5 |
| `EMAIL_USER` | hifdhfx01@gmail.com |
| `EMAIL_PASS` | Your Gmail App Password (see below) |
| `FRONTEND_URL` | Your Netlify URL |

### STEP 4 — Gmail App Password
1. Go to myaccount.google.com
2. Security → 2-Step Verification (enable it first)
3. Security → App Passwords
4. Select app: "Mail" → Generate
5. Copy the 16-character password → paste as EMAIL_PASS in Railway

### STEP 5 — Get your Railway URL
After deploy, Railway gives you a URL like:
`https://hifdhfx-backend-production.up.railway.app`

Copy this URL — you need it for STEP 6.

### STEP 6 — Connect Frontend to Backend
In your HifdhFX website HTML file, find this line:
```
const BACKEND_URL = 'http://localhost:3000';
```
Replace with your Railway URL:
```
const BACKEND_URL = 'https://hifdhfx-backend-production.up.railway.app';
```
Then re-upload to Netlify.

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health | Check server is running |
| POST | /api/users/register | Register new user |
| POST | /api/users/login | Login user |
| GET | /api/users | Get all users (admin) |
| PUT | /api/users/:id | Update user profile |
| POST | /api/orders | Create new FX order |
| GET | /api/orders | Get all orders (admin) |
| GET | /api/orders/user/:userId | Get user orders |
| PUT | /api/orders/:orderId/fulfil | Mark order fulfilled + email customer |
| POST | /api/paystack/verify | Verify payment reference |
| POST | /api/paystack/transfer | Send money to customer (auto-payout) |
| POST | /api/paystack/webhook | Paystack webhook receiver |
| POST | /api/transactions | Save conversion record |
| GET | /api/transactions/user/:userId | Get user history |
| GET | /api/rates/:base | Live exchange rates |
| GET | /api/admin/stats | Dashboard statistics |

---

## 📊 What the Backend Does

✅ **Stores all users permanently** in SQLite database
✅ **Stores all orders permanently** — never lost if browser clears
✅ **Emails you** (admin) instantly when new order arrives
✅ **Emails customer** automatically when order is confirmed
✅ **Emails customer** automatically when order is fulfilled
✅ **Verifies Paystack payments** server-side (secure)
✅ **Can auto-transfer** money to customers via Paystack API
✅ **Provides live rates** without CORS issues
✅ **Admin statistics** — total users, orders, pending count

---

## 💰 Railway.app Free Tier Limits
- 500 hours/month free (enough for 24/7 operation)
- 1GB RAM
- 1GB storage (SQLite database)
- $5 credit free on signup
- Upgrade to Hobby plan ($5/month) for unlimited hours

---

## 📞 Support
- Owner: Balogun Sodiq O
- Email: hifdhfx01@gmail.com
- WhatsApp: +234 812 919 0409
- Location: Opposite NYSC Camp, Kubwa, Abuja
