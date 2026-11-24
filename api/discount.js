// Checks a discount code and says how much it takes off.
const { findCode, hasKey } = require('./_stripe');
module.exports = async (req, res) => {
  if (!hasKey()) { res.status(500).json({ ok: false, error: 'Stripe key is missing in Vercel settings.' }); return; }
  try {
    const hit = await findCode(req.query && req.query.code);
    if (!hit) { res.status(200).json({ ok: false, error: 'That code isn’t valid or was already used.' }); return; }
    res.status(200).json({ ok: true, code: hit.code, percent: hit.percent });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Could not check the code. Try again.' });
  }
};
