/**
 * server.js — Sortly.AI backend
 * ------------------------------
 * Express server that powers the Sortly.AI website and handles Stripe
 * payments (subscriptions + one-time purchases) via hosted Checkout.
 *
 * Requires the env vars in .env (see .env.example).
 */
const express = require("express");
const Stripe = require("stripe");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Stripe client (secret key stays server-side — never exposed to the browser)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs for each product (generate via: npm run setup:stripe)
const PRICES = {
  personal: process.env.STRIPE_PRICE_PERSONAL,
  business: process.env.STRIPE_PRICE_BUSINESS,
  oneTime: process.env.STRIPE_PRICE_ONE_TIME,
};

// --- Static frontend ---
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Pretty URLs
app.get("/pricing", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "pricing.html"))
);

// --- Subscription checkout (Personal / Business) ---
app.post("/api/create-subscription", async (req, res) => {
  try {
    const plan = req.body.plan; // 'personal' | 'business'
    const priceId = PRICES[plan];
    if (!priceId) {
      return res.status(400).json({ error: "Unknown plan. Choose personal or business." });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.body.email || undefined,
      subscription_data: req.body.trialDays
        ? { trial_period_days: req.body.trialDays }
        : undefined,
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/pricing`,
      metadata: { plan, kind: "subscription" },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("Subscription error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- One-time payment (e.g. credits pack) ---
app.post("/api/create-one-time", async (req, res) => {
  try {
    const qty = Math.max(1, parseInt(req.body.quantity, 10) || 1);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: PRICES.oneTime, quantity: qty }],
      customer_email: req.body.email || undefined,
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/pricing`,
      metadata: { kind: "one-time", quantity: String(qty) },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("One-time error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Get a checkout session's details (for the success page) ---
app.get("/api/session/:id", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);
    res.json({
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      subscription: !!session.subscription,
    });
  } catch (e) {
    res.status(404).json({ error: "Session not found" });
  }
});

// --- Webhook: provision accounts after successful payment ---
// For local testing:  stripe listen --forward-to localhost:3000/webhook
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_details?.email;
        const kind = session.metadata?.kind;
        console.log(
          `✅ Payment completed for ${email} (${kind}, ${session.amount_total / 100} ${session.currency})`
        );
        // TODO: provision your user — e.g. mark them subscribed in your DB,
        // send them an email, or generate an API key.
        break;
      }
      case "customer.subscription.deleted":
        console.log("Subscription cancelled for", event.data.object.customer);
        // TODO: downgrade the user to the Free tier.
        break;
      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Sortly.AI website running at ${BASE_URL}`);
});