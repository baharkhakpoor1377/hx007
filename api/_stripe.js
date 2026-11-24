// Small helper for talking to Stripe. Files starting with "_" are not public pages.
const KEY = process.env.STRIPE_SECRET_KEY;
async function st(path, method, params) {
  const qs = method === 'GET' && params ? '?' + params.toString() : '';
  const r = await fetch('https://api.stripe.com/v1' + path + qs, {
    method,
    headers: {
      Authorization: 'Bearer ' + KEY,
      'Stripe-Version': '2024-06-20',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: method === 'POST' ? (params || new URLSearchParams()).toString() : undefined
  });
  const j = await r.json();
  return { ok: r.ok, status: r.status, j };
}
// Finds an active promotion code and returns { id, percent, code } or null.
async function findCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  if (!code) return null;
  const r = await st('/promotion_codes', 'GET', new URLSearchParams({ code, active: 'true', limit: '1' }));
  const pc = r.ok && r.j.data && r.j.data[0];
  if (!pc || !pc.coupon || !pc.coupon.valid) return null;
  if (pc.max_redemptions && pc.times_redeemed >= pc.max_redemptions) return null;
  if (!pc.coupon.percent_off) return null;
  return { id: pc.id, percent: pc.coupon.percent_off, code: pc.code };
}
module.exports = { st, findCode, hasKey: () => !!KEY };
