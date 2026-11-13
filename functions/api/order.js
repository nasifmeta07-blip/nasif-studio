// GET /api/order?ref=XXXX → asks Thawani whether that order was really paid (used by success pages).
export async function onRequestGet({ request, env }) {
  const live = env.THAWANI_MODE === "live";
  const API = live ? "https://checkout.thawani.om/api/v1" : "https://uatcheckout.thawani.om/api/v1";
  const ref = new URL(request.url).searchParams.get("ref") || "";
  if (!/^[A-Z0-9]{8,24}$/.test(ref)) return json({ error: "Bad reference" }, 400);

  const r = await fetch(`${API}/checkout/session/reference/${ref}`, {
    headers: { "thawani-api-key": env.THAWANI_SECRET_KEY || "" },
  });
  const data = await r.json().catch(() => ({}));
  const s = data && data.data;
  if (!r.ok || !s) return json({ error: "Order not found" }, 404);
  return json({
    ref,
    status: s.payment_status, // "paid" | "unpaid" | "cancelled"
    total: s.total_amount, // baisa
    name: s.metadata && s.metadata.customer_name,
    pickup: s.metadata && s.metadata.when,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
