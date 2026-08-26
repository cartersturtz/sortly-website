/**
 * app.js — Sortly.AI frontend payment handler
 * Collects the chosen plan and calls the backend, then redirects to
 * Stripe's hosted Checkout page.
 */

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("button[data-plan]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const plan = btn.getAttribute("data-plan");
      if (plan === "free") {
        // Free plan: no payment needed. Route to a sign-up flow / success.
        window.location.href = "/success?plan=free";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Redirecting to secure checkout…";
      try {
        const endpoint =
          plan === "personal" || plan === "business"
            ? "/api/create-subscription"
            : "/api/create-one-time";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, quantity: 1 }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url; // → Stripe hosted Checkout
        } else {
          throw new Error(data.error || "Could not start checkout");
        }
      } catch (err) {
        const toast = document.getElementById("toast");
        if (toast) {
          toast.textContent = "Payment setup failed: " + err.message;
          toast.style.display = "block";
        }
        btn.disabled = false;
        btn.textContent = "Try Again";
      }
    });
  });
});