// Saves a customer's email in Stripe (Customers) and creates a personal 10% code.
// Needs STRIPE_SECRET_KEY in Vercel.
const crypto = require('crypto');
const { st, hasKey } = require('./_stripe');
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike letters (0/O, 1/I/L)
function normalize(e) {
  let [l, d] = e.split('@');
  l = l.split('+')[0];
  if (d === 'gmail.com' || d === 'googlemail.com') { l = l.replace(/\./g, ''); d = 'gmail.com'; }
  return l + '@' + d;
}
const makeCode = () => 'HX-' + Array.from({ length: 4 }, () => CHARS[crypto.randomInt(CHARS.length)]).join('');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!hasKey()) { res.status(500).json({ error: 'Stripe key is missing in Vercel settings.' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    if (body.website) { res.status(200).json({ code: makeCode() }); return; } // hidden spam field
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) { res.status(400).json({ error: 'Please enter a valid email.' }); return; }
    if (body.consent !== true) { res.status(400).json({ error: 'Please tick the box to receive your code.' }); return; }

    // One welcome code per person, ever. Treat name+tag@gmail.com and n.a.me@gmail.com as the same inbox.
    const key = normalize(email);
    const bySearch = await st('/customers/search', 'GET', new URLSearchParams({ query: `metadata['hx_key']:'${key.replace(/'/g, '')}'`, limit: '1' }));
    const byEmail = await st('/customers', 'GET', new URLSearchParams({ email, limit: '1' }));
    const hit = (bySearch.ok && bySearch.j.data && bySearch.j.data[0]) || null;
    const existing = hit || (byEmail.ok && byEmail.j.data && byEmail.j.data[0]) || null;
    if (existing && existing.metadata && existing.metadata.hx_code) {
      res.status(409).json({ error: 'This email has already claimed its welcome code. It can only be used once.' }); return;
    }

    // One shared 10% coupon, created the first time.
    const c = await st('/coupons/HX10', 'GET');
    if (!c.ok) {
      const mk = await st('/coupons', 'POST', new URLSearchParams({ id: 'HX10', percent_off: '10', duration: 'once', name: 'Welcome 10% off' }));
      if (!mk.ok) { res.status(500).json({ error: 'Could not create your code. Please try again.' }); return; }
    }

    // A personal one-time code.
    let code = null;
    for (let i = 0; i < 8 && !code; i++) {
      const tryCode = makeCode();
      const pc = await st('/promotion_codes', 'POST', new URLSearchParams({
        coupon: 'HX10', code: tryCode, max_redemptions: '1', 'metadata[email]': email
      }));
      if (pc.ok) code = tryCode;
    }
    if (!code) { res.status(500).json({ error: 'Could not create your code. Please try again.' }); return; }

    // Save the email for marketing.
    const meta = new URLSearchParams({
      email, 'metadata[marketing_consent]': 'yes', 'metadata[source]': 'welcome popup',
      'metadata[hx_code]': code, 'metadata[hx_key]': key, 'metadata[consent_at]': new Date().toISOString()
    });
    await st(existing ? '/customers/' + existing.id : '/customers', 'POST', meta);

    res.status(200).json({ code });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
