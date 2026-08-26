# Sortly.AI — Website + Stripe Payments

A complete SaaS website for **Sortly.AI** (the AI-powered drive organizer) that accepts
**Stripe subscriptions** (Free / Personal / Business) and **one-time purchases** via
Stripe's secure hosted Checkout.

## Features

- 🏠 Modern marketing landing page + pricing page
- 💳 **Stripe Checkout** — subscriptions (recurring) and one-time payments
  - Free — $0
  - Personal — $9/mo
  - Business — $29/mo
  - One-time Credits pack — $10
- 🔒 PCI-compliant: card data never touches your server (hosted Checkout)
- 🔁 **Webhook** handler to provision accounts after successful payment
- 📄 Success & cancellation pages

## Tech stack

- **Node.js + Express** backend
- **Stripe Node SDK** (v16+)
- Vanilla HTML / CSS / JS frontend (served by Express)

## 1. Setup

```bash
# Install dependencies
npm install

# Copy the env template and fill in your values
cp .env.example .env
```

In `.env`:
1. Set `STRIPE_SECRET_KEY` — your Stripe **Secret** key (`sk_test_...` for testing,
   `sk_live_...` for production) from https://dashboard.stripe.com/apikeys
2. Set `BASE_URL` to your site URL (local dev: `http://localhost:3000`)
3. Create the Products/Prices:

```bash
npm run setup:stripe
```

This creates the three subscription plans and the one-time credits product in Stripe
and prints Price IDs. Paste them into `.env` as `STRIPE_PRICE_PERSONAL`,
`STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ONE_TIME`.

## 2. Run locally

```bash
npm start
# → http://localhost:3000
```

Click a plan → you're redirected to Stripe's hosted Checkout. Use Stripe's test card
`4242 4242 4242 4242`, any future date, any CVC.

## 3. Webhook (for auto-provisioning)

To test webhooks locally (grant access after a successful payment):

```bash
stripe listen --forward-to localhost:3000/webhook
```

Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in `.env`, restart the server,
and complete a test payment. The server logs when a payment completes and you can add
your provisioning logic (e.g. create the user, send an email) in `server.js` under
the `checkout.session.completed` case.

## 4. Deploy

The app is a standard Node/Express server — deploy anywhere Node runs:

- **Render / Railway / Fly.io**: point at `npm start`, set the `.env` vars.
- **Vercel**: it's an Express server, so use a Node serverless adapter or deploy via a
  hobby Render instance instead.

Make sure `BASE_URL` is your **public https URL** so Stripe redirects work.

## Project structure

```
sortly-website/
├── server.js               # Express + Stripe checkout & webhook
├── scripts/setup-stripe.js # Creates products/prices in Stripe
├── public/
│   ├── index.html          # Landing page (with pricing)
│   ├── pricing.html        # Pricing page
│   ├── success.html        # Post-payment success
│   ├── cancel.html         # Cancelled payment
│   ├── css/style.css
│   └── js/app.js           # Purchase buttons → Checkout
└── .env.example
```