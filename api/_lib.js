const UAS = [
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function validUrl(u) {
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; }
}

function decode(s) {
  if (!s) return '';
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).trim();
}

function metaTag(html, names) {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${n}["']`, 'i');
    const m = html.match(re1) || html.match(re2);
    if (m) return decode(m[1]);
  }
  return '';
}

async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal, redirect: 'follow' }); }
  finally { clearTimeout(t); }
}

async function getMeta(url) {
  const out = { url, finalUrl: url, title: '', description: '', image: '', site: '' };
  const isTikTok = /tiktok\.com/i.test(new URL(url).hostname);

  for (const ua of UAS) {
    try {
      const r = await fetchWithTimeout(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' } });
      out.finalUrl = r.url || url;
      const html = (await r.text()).slice(0, 600000);
      out.title = out.title || metaTag(html, ['og:title', 'twitter:title']) || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]);
      out.description = out.description || metaTag(html, ['og:description', 'twitter:description', 'description']);
      out.image = out.image || metaTag(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']);
      out.site = out.site || metaTag(html, ['og:site_name']);
      if (out.image && out.title) break;
    } catch (e) { /* try next UA */ }
  }

  if (isTikTok && !out.image) {
    try {
      const r = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(out.finalUrl)}`);
      const d = await r.json();
      if (d.thumbnail_url) out.image = d.thumbnail_url;
      if (d.title) out.title = d.title;
      if (d.author_name) out.description = out.description || '@' + (d.author_unique_id || d.author_name);
    } catch (e) {}
  }
  if (out.image) { try { out.image = new URL(out.image, out.finalUrl).href; } catch (e) {} }
  return out;
}

module.exports = { cors, validUrl, getMeta, fetchWithTimeout, UAS };
