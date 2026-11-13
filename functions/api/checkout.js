// POST /api/checkout  (Cloudflare Pages Function)
// One function for every demo. The body says which shop ("shop": "cakes-and-dreams"),
// and prices are read from that shop's own /<shop>/catalog.json, never from the browser.
//
// Environment variables (Cloudflare → Pages project → Settings → Variables):
//   THAWANI_SECRET_KEY, THAWANI_PUBLISHABLE_KEY, THAWANI_MODE = "uat" (test) or "live"

const SHOP_RE = /^[a-z0-9-]{2,40}$/;

export async function onRequestPost({ request, env }) {
  const live = env.THAWANI_MODE === "live";
  const API = live ? "https://checkout.thawani.om/api/v1" : "https://uatcheckout.thawani.om/api/v1";
  const PAY = live ? "https://checkout.thawani.om/pay" : "https://uatcheckout.thawani.om/pay";
  if (!env.THAWANI_SECRET_KEY || !env.THAWANI_PUBLISHABLE_KEY) return json({ error: "Thawani keys are not set" }, 500);

  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const { shop = "", items = [], name = "", phone = "", delivery = "pickup", date = "", time = "", pickup = "", address = "" } = b;
  if (!SHOP_RE.test(shop)) return json({ error: "Unknown shop" }, 400);
  if (!String(name).trim() || !/^\+?\d[\d\s]{6,14}$/.test(String(phone).trim()))
    return json({ error: "Name and a valid phone number are required" }, 400);

  // Load the shop's catalog from the site's own static files.
  const origin = new URL(request.url).origin;
  const catRes = await env.ASSETS.fetch(new Request(`${origin}/${shop}/catalog.json`));
  let catalog;
  try { if (!catRes.ok) throw 0; catalog = await catRes.json(); } catch { return json({ error: "Unknown shop" }, 400); }

  const products = [], notes = [];
  for (const it of Array.isArray(items) ? items.slice(0, 30) : []) {
    const p = (catalog.products || []).find((x) => x.id === it.id);
    if (!p) continue;
    const qty = Math.floor(Number(it.qty));
    if (!(qty >= 1 && qty <= 50)) continue;
    const label = (p.en && p.en.name) || p.name_en || p.id;
    let unit, title = label;
    if (Array.isArray(p.sizes)) {
      const s = p.sizes.find((x) => x.id === it.size);
      if (!s) continue;
      unit = s.price; title = `${label} ${s.id}`;
    } else unit = p.price;
    if (!Number.isInteger(unit) || unit < 1) continue;
    products.push({ name: title.slice(0, 40), quantity: qty, unit_amount: unit }); // baisa
    if (it.msg) notes.push(`${label}: "${String(it.msg).slice(0, 40)}"`);
  }
  if (!products.length) return json({ error: "Cart is empty" }, 400);

  let fulfilment = "pickup";
  if (Array.isArray(catalog.delivery)) {
    const d = catalog.delivery.find((x) => x.id === delivery) || catalog.delivery[0];
    fulfilment = d.id;
    if (d.price > 0) products.push({ name: String(d.en).slice(0, 40), quantity: 1, unit_amount: d.price });
  }

  const prefix = shop.replace(/-/g, "").slice(0, 2).toUpperCase().padEnd(2, "X");
  const ref = prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

  const r = await fetch(`${API}/checkout/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "thawani-api-key": env.THAWANI_SECRET_KEY },
    body: JSON.stringify({
      client_reference_id: ref,
      mode: "payment",
      products,
      success_url: `${origin}/${shop}/success.html?ref=${ref}`,
      cancel_url: `${origin}/${shop}/cancel.html?ref=${ref}`,
      metadata: {
        shop,
        customer_name: String(name).slice(0, 60),
        phone: String(phone).slice(0, 20),
        fulfilment,
        when: (pickup || `${String(date).slice(0, 10)} ${String(time).slice(0, 8)}`).slice(0, 40),
        address: String(address).slice(0, 120),
        notes: notes.join(" | ").slice(0, 200),
      },
    }),
  });
  const data = await r.json().catch(() => ({}));
  const sid = data && data.data && data.data.session_id;
  if (!r.ok || !sid) { console.log("Thawani error", r.status, JSON.stringify(data)); return json({ error: "Could not start checkout" }, 502); }
  return json({ url: `${PAY}/${sid}?key=${env.THAWANI_PUBLISHABLE_KEY}`, ref });
}

export const onRequest = () => json({ error: "POST only" }, 405);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
