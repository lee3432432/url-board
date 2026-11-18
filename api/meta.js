const { cors, validUrl, getMeta } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const url = validUrl(req.query.url || '');
  if (!url) return res.status(400).json({ error: 'url 파라미터가 필요해요' });
  const m = await getMeta(url);
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  res.status(200).json(m);
};
