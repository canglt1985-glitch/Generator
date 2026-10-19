/**
 * Serverless Photo Proxy for Telegram CDN Media
 * Route: GET /api/photo?file_id=<tg_file_id>
 * 
 * Works seamlessly in both:
 * 1. Vercel Serverless Function environment (req, res with .status(), .json(), .send())
 * 2. Vite Dev Server / Node native http (ServerResponse with statusCode, setHeader, end)
 */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';

const FALLBACK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">
  <rect width="400" height="300" fill="#f1f5f9"/>
  <path d="M160 130C160 118.954 168.954 110 180 110H220C231.046 110 240 118.954 240 130V170C240 181.046 231.046 190 220 190H180C168.954 190 160 181.046 160 170V130Z" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="190" cy="140" r="8" fill="#94a3b8"/>
  <path d="M165 175L185 155L200 170L215 145L235 175H165Z" fill="#cbd5e1"/>
  <text x="200" y="225" font-family="system-ui, sans-serif" font-size="13" fill="#64748b" text-anchor="middle" font-weight="500">
    Không tải được ảnh Telegram
  </text>
</svg>`.trim();

function send(res, statusCode, body, contentType = null) {
  if (typeof res.setHeader === 'function' && contentType) {
    res.setHeader('Content-Type', contentType);
  }

  // Vercel Serverless environment
  if (typeof res.status === 'function') {
    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      return res.status(statusCode).json(body);
    }
    return res.status(statusCode).send(body);
  }

  // Native Node.js ServerResponse
  res.statusCode = statusCode;
  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }
    return res.end(JSON.stringify(body));
  }
  return res.end(body);
}

export default async function handler(req, res) {
  // Allow CORS for TVT3 web apps
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return send(res, 200, '');
  }

  const query = req.query || {};
  const fileId = query.file_id || query.id;
  const returnInfoOnly = query.info === '1';

  if (!fileId) {
    return send(res, 400, { 
      error: 'Missing file_id parameter. Usage: /api/photo?file_id=<telegram_file_id>' 
    });
  }

  try {
    // 1. Resolve Telegram File Path via getFile
    const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const infoResp = await fetch(getFileUrl);
    const infoData = await infoResp.json();

    if (!infoData.ok || !infoData.result || !infoData.result.file_path) {
      if (returnInfoOnly) {
        return send(res, 404, { error: 'File not found on Telegram', details: infoData });
      }
      return send(res, 404, FALLBACK_SVG, 'image/svg+xml');
    }

    const filePath = infoData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    if (returnInfoOnly) {
      return send(res, 200, {
        ok: true,
        file_id: fileId,
        file_path: filePath,
        file_size: infoData.result.file_size,
        download_url: downloadUrl
      });
    }

    // 2. Fetch binary stream from Telegram CDN
    const imgResp = await fetch(downloadUrl);
    if (!imgResp.ok) {
      return send(res, imgResp.status, FALLBACK_SVG, 'image/svg+xml');
    }

    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imgResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Set Aggressive 1-Year Immutable Browser Cache
    if (typeof res.setHeader === 'function') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', buffer.length);
    }

    return send(res, 200, buffer, contentType);
  } catch (error) {
    console.error('[photo_proxy_error]', error);
    return send(res, 500, FALLBACK_SVG, 'image/svg+xml');
  }
}
