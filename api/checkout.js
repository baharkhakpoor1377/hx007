// Vercel serverless function: creates a Stripe Checkout Session.
// Needs the STRIPE_SECRET_KEY environment variable in Vercel.
// Prices live here (server side) so nobody can change them in the browser.
const PRODUCTS = {
  t2: { name: "H\u00f8nt\u00e9rx Ember Paw II Oversized Tee", price: 45 },
  t4: { name: "H\u00f8nt\u00e9rx Wild Paw Oversized Tee", price: 45 },
  t5: { name: "H\u00f8nt\u00e9rx Shadow Paw Oversized Tee", price: 45 },
  t6: { name: "H\u00f8nt\u00e9rx Prism Paw Oversized Tee", price: 45 },
  t8: { name: "H\u00f8nt\u00e9rx Liberty Paw Oversized Tee", price: 45 },
  t10: { name: "H\u00f8nt\u00e9rx Crimson Paw Oversized Tee", price: 45 },
  t11: { name: "H\u00f8nt\u00e9rx Navy Paw Oversized Tee", price: 45 },
  t12: { name: "H\u00f8nt\u00e9rx HonterX Collage Oversized Tee", price: 45 },
  h1: { name: "H\u00f8nt\u00e9rx Midnight Blue Paw Hoodie", price: 85 },
  h2: { name: "H\u00f8nt\u00e9rx Crimson Paw Hoodie", price: 85 },
  h3: { name: "H\u00f8nt\u00e9rx Carolina Blue Paw Hoodie", price: 85 },
  h4: { name: "H\u00f8nt\u00e9rx Forest Green Paw Hoodie", price: 85 },
  h5: { name: "H\u00f8nt\u00e9rx Gold Paw Hoodie", price: 85 },
  h6: { name: "H\u00f8nt\u00e9rx Burgundy Paw Hoodie", price: 85 },
  h7: { name: "H\u00f8nt\u00e9rx Cobalt Paw Hoodie", price: 85 },
  h8: { name: "H\u00f8nt\u00e9rx Moss Paw Hoodie", price: 85 },
  h9: { name: "H\u00f8nt\u00e9rx Blood Paw Hoodie", price: 85 },
  h10: { name: "H\u00f8nt\u00e9rx Bronze Paw Hoodie", price: 85 },
  h11: { name: "H\u00f8nt\u00e9rx Ember Paw Hoodie", price: 85 },
  h12: { name: "H\u00f8nt\u00e9rx Prism Paw Hoodie", price: 85 },
  t13: { name: "H\u00f8nt\u00e9rx Ice Paw Oversized Tee", price: 45 },
  h15: { name: "H\u00f8nt\u00e9rx Royal Paw Hoodie", price: 85 },
  h16: { name: "H\u00f8nt\u00e9rx Military Green Paw Hoodie", price: 85 },
  h17: { name: "H\u00f8nt\u00e9rx Sky Paw Hoodie", price: 85 },
  h18: { name: "H\u00f8nt\u00e9rx Royal Gold Paw Hoodie", price: 85 },
  t6: { name: "H\u00f8nt\u00e9rx Signature Oversized Tee", price: 45 },
  t7: { name: "H\u00f8nt\u00e9rx Phantom Oversized Tee (Black)", price: 45 },
  t8: { name: "H\u00f8nt\u00e9rx Phantom Oversized Tee (White)", price: 45 },
  h19: { name: "H\u00f8nt\u00e9rx Midnight Raglan Hoodie", price: 85 },
  h20: { name: "H\u00f8nt\u00e9rx Ivory Raglan Hoodie", price: 85 },
  h21: { name: "H\u00f8nt\u00e9rx Gold Raglan Hoodie", price: 85 },
  j1: { name: "H\u00f8nt\u00e9rx Sherpa Paw Jacket", price: 120 },
  j2: { name: "H\u00f8nt\u00e9rx Sherpa Paw Jacket (Navy)", price: 120 },
  j3: { name: "H\u00f8nt\u00e9rx Sherpa Paw Jacket (Khaki)", price: 120 },
  j4: { name: "H\u00f8nt\u00e9rx Sherpa Paw Jacket (Red Brown)", price: 120 },
  s1: { name: "H\u00f8nt\u00e9rx Midnight Paw Raglan Sweatshirt", price: 65 },
  s2: { name: "H\u00f8nt\u00e9rx Ivory Paw Raglan Sweatshirt", price: 65 },
  s3: { name: "H\u00f8nt\u00e9rx Arena Raglan Sweatshirt", price: 65 },
  c1: { name: "H\u00f8nt\u00e9rx Azure Paw Cap", price: 35 },
  c2: { name: "H\u00f8nt\u00e9rx Lime Paw Cap", price: 35 },
  c3: { name: "H\u00f8nt\u00e9rx Gold Paw Cap (Royal)", price: 35 },
  c4: { name: "H\u00f8nt\u00e9rx Gold Paw Cap (Camo)", price: 35 },
  c5: { name: "H\u00f8nt\u00e9rx Bronze Paw Cap (Dark Grey)", price: 35 },
  c6: { name: "H\u00f8nt\u00e9rx Ember Paw Cap (Black)", price: 35 }
};
const FREE_SHIPPING_OVER = 150; // free shipping over this subtotal
const FLAT_SHIPPING = 12;       // otherwise this flat rate

const { findCode } = require('./_stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(500).json({ error: 'Stripe key is missing in Vercel settings.' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const cur = body.currency === 'USD' ? 'usd' : 'cad';
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    const p = new URLSearchParams();
    let subtotal = 0, n = 0;
    for (const it of items) {
      const prod = PRODUCTS[it.id];
      const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
      if (!prod) continue;
      const label = [it.color, it.size].filter(Boolean).join(' / ');
      p.append(`line_items[${n}][quantity]`, String(qty));
      p.append(`line_items[${n}][price_data][currency]`, cur);
      p.append(`line_items[${n}][price_data][unit_amount]`, String(Math.round(prod.price * 100)));
      p.append(`line_items[${n}][price_data][product_data][name]`, label ? `${prod.name} — ${label}` : prod.name);
      subtotal += prod.price * qty;
      n++;
    }
    if (!n) { res.status(400).json({ error: 'Your cart is empty.' }); return; }
    const origin = process.env.SITE_URL || `https://${req.headers.host}`;
    p.append('mode', 'payment');
    p.append('phone_number_collection[enabled]', 'true');
    if (body.code) {
      const hit = await findCode(body.code);
      if (!hit) { res.status(400).json({ error: 'That discount code is no longer valid. Remove it and try again.' }); return; }
      p.append('discounts[0][promotion_code]', hit.id); // 10% off the whole order
    } else {
      p.append('allow_promotion_codes', 'true');
    }
    p.append('success_url', `${origin}/success.html`);
    p.append('cancel_url', `${origin}/#shop`);
    p.append('shipping_address_collection[allowed_countries][0]', 'CA');
    p.append('shipping_address_collection[allowed_countries][1]', 'US');
    const free = subtotal >= FREE_SHIPPING_OVER;
    p.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    p.append('shipping_options[0][shipping_rate_data][display_name]', free ? 'Free shipping' : 'Standard shipping');
    p.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', free ? '0' : String(FLAT_SHIPPING * 100));
    p.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', cur);
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString()
    });
    const j = await r.json();
    if (!r.ok) { res.status(400).json({ error: (j.error && j.error.message) || 'Stripe error.' }); return; }
    res.status(200).json({ url: j.url });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
