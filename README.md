# Nasif Studio — demo sites + Thawani checkout

One repo hosts **every** demo and client mockup. Each one lives in its own folder and gets its own link:

```
nasif-studio.pages.dev/                     ← studio landing page
nasif-studio.pages.dev/sukkar-saffron/      ← demo store (fictional)
nasif-studio.pages.dev/cakes-and-dreams/    ← concept for a real business (private link, not listed)
```

Hosting is **Cloudflare Pages**, which is free and allows commercial use. There's one shared payment backend (`functions/api/`) for all sites.

## Folder layout

| Path | What it is |
|---|---|
| `index.html` | Studio landing page (lists fictional demos only) |
| `<shop>/index.html` | The shop's site |
| `<shop>/catalog.json` | Its products and prices, in **baisa** (4500 = 4.500 OMR) |
| `<shop>/success.html`, `cancel.html` | Where Thawani sends customers back |
| `functions/api/checkout.js` | Creates the Thawani payment. Reads prices from `/<shop>/catalog.json`, never from the browser |
| `functions/api/order.js` | Checks with Thawani whether an order was really paid |
| `404.html` | Not-found page (also stops Cloudflare serving the landing page for unknown paths) |

## One-time setup (~15 min)

1. **GitHub:** create an empty repo called `nasif-studio` and push this folder to it.
2. **Cloudflare:** sign up at dash.cloudflare.com, then go to **Workers & Pages → Create → Pages → Connect to Git**.
   - Pick the repo.
   - Framework preset: **None**.
   - Build command: *(leave empty)*.
   - Build output directory: `/`.
   - Project name: `nasif-studio`. This becomes the link.
3. **Thawani test keys:** get the UAT keys from developer.thawani.om. Then in Cloudflare go to **your project → Settings → Variables and Secrets** and add:
   - `THAWANI_SECRET_KEY` (type: Secret)
   - `THAWANI_PUBLISHABLE_KEY`
   - `THAWANI_MODE` = `uat`
4. **Redeploy:** Deployments → ⋯ → Retry. Then open `/sukkar-saffron/`, add a cake and press Pay. You should land on Thawani's test checkout, so pay with their test card.
5. In `index.html`, replace `968XXXXXXXX` with your own WhatsApp number.

## Adding a new mockup

1. Copy a shop folder, e.g. `cakes-and-dreams/` → `new-shop/`.
2. Edit its `catalog.json` and the text in its `index.html`.
3. In its `index.html`, change `shop: "cakes-and-dreams"` to `shop: "new-shop"` (the folder name).
4. Push to GitHub. Cloudflare redeploys automatically in about a minute.

Real-business concepts keep `<meta name="robots" content="noindex">` so Google never lists them. Only share their link privately with the owner.

## When a client says yes

Move them to their own Cloudflare project and domain, and swap in **their** live Thawani keys with `THAWANI_MODE=live`. The client registers with Thawani as the merchant themselves.

## Optional: own domain

Buy a domain (e.g. `nasifstudio.com`) through Cloudflare Registrar, then add it under **project → Custom domains**. Links then look like `nasifstudio.com/cakes-and-dreams/`.
