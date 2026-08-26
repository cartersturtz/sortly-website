/**
 * setup-stripe.js
 * -----------------
 * Creates the Sortly.AI Products and Prices in your Stripe account, then
 * prints the resulting Price IDs. Paste those into your .env file as
 * STRIPE_PRICE_PERSONAL / STRIPE_PRICE_BUSINESS / STRIPE_PRICE_ONE_TIME.
 *
 * Run:  npm run setup:stripe
 */
const Stripe = require("stripe");

(async () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("❌ STRIPE_SECRET_KEY is not set. Add it to your .env first.");
    process.exit(1);
  }
  const stripe = new Stripe(key);

  const mkPrice = async (productName, unit_amount_cents, recurring) => {
    const product = await stripe.products.create({ name: productName });
    const data = {
      product: product.id,
      unit_amount: unit_amount_cents,
      currency: "usd",
    };
    if (recurring) data.recurring = { interval: "month" };
    const price = await stripe.prices.create(data);
    return price;
  };

  console.log("Creating products & prices...\n");

  // Subscriptions (recurring, monthly)
  const personal = await mkPrice("Sortly.AI Personal", 900, true);   // $9/mo
  const business = await mkPrice("Sortly.AI Business", 2900, true);  // $29/mo
  // One-time product (e.g. credit packs)
  const onetime = await mkPrice("Sortly.AI Credits (1 pack)", 1000, false); // $10

  console.log("\n✅ Done! Paste these into your .env:\n");
  console.log(`STRIPE_PRICE_PERSONAL=${personal.id}`);
  console.log(`STRIPE_PRICE_BUSINESS=${business.id}`);
  console.log(`STRIPE_PRICE_ONE_TIME=${onetime.id}\n`);
})().catch((e) => {
  console.error("Setup failed:", e.message);
  process.exit(1);
});