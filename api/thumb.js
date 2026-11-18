// 링크 주소를 받아 대표 이미지를 그대로 돌려줌 (만료되는 CDN 주소·핫링크 차단 회피)
const { cors, validUrl, getMeta, fetchWithTimeout, UAS } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  const url = validUrl(req.query.url || '');
  if (!url) return res.status(400).end();
  try {
    const m = await getMeta(url);
    if (!m.image) return res.status(404).end();
    const r = await fetchWithTimeout(m.image, { headers: { 'User-Agent': UAS[1], 'Referer': new URL(m.finalUrl).origin + '/' } });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).end();
  }
};
