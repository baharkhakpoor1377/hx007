// Vercel serverless function: creates a Stripe Checkout Session.
// Needs the STRIPE_SECRET_KEY environment variable in Vercel.
// Prices live here (server side) so nobody can change them in the browser.
const PRODUCTS = {
  th1: { name: 'Høntérx Test Hoodie 1', price: 1 },
  th2: { name: 'Høntérx Test Hoodie 2', price: 2 }
};
const FREE_SHIPPING_OVER = 150; // free shipping over this subtotal
const FLAT_SHIPPING = 12;       // otherwise this flat rate

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
