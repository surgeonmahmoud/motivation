import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '.env');
const HOME_ENV_PATH = path.join(os.homedir(), '.env');
const DATA_PATH = path.join(__dirname, 'studio-user-data.json');
const HTML_PATH = path.join(__dirname, 'mozakrawi-content-studio.html');
const SERIES_HTML_PATH = path.join(__dirname, 'mozakrawi-baad-awal-matab-november.html');
const HAWAMESH_HTML_PATH = path.join(__dirname, 'mozakrawi-hawamesh-reader.html');
const HAWAMESH_MD_PATH = path.join(__dirname, 'mozakrawi-hawamesh-novella.md');
const MD_PATH = path.join(__dirname, 'mozakrawi-content-bank-2026-10-30.md');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) result[key] = val;
  }
  return result;
}

function getEffectiveApiKey(headerKey) {
  if (headerKey && headerKey.trim()) return headerKey.trim();
  const localEnv = parseEnvFile(ENV_PATH);
  if (localEnv.GEMINI_API_KEY) return localEnv.GEMINI_API_KEY.trim();
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const homeEnv = parseEnvFile(HOME_ENV_PATH);
  if (homeEnv.GEMINI_API_KEY) return homeEnv.GEMINI_API_KEY.trim();
  return '';
}

function saveApiKeyToLocalEnv(newKey) {
  const cleanKey = String(newKey || '').trim();
  let lines = [];
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
  }
  let replaced = false;
  lines = lines.map((line) => {
    if (line.trim().startsWith('GEMINI_API_KEY=')) {
      replaced = true;
      return cleanKey ? `GEMINI_API_KEY=${cleanKey}` : 'GEMINI_API_KEY=';
    }
    return line;
  });
  if (!replaced) {
    lines.push(`GEMINI_API_KEY=${cleanKey}`);
  }
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });
}

function readUserData() {
  if (!fs.existsSync(DATA_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeUserData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

const localEnvInit = parseEnvFile(ENV_PATH);
const PORT = Number(localEnvInit.PORT || process.env.PORT || 3456);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  // The weekly story is the current reader; the earlier studio remains at /studio.
  const weeklyAliases = ['/', '/index.html', '/reader', '/hawamesh', '/weekly', '/weekly/'];
  if (req.method === 'GET' && (weeklyAliases.includes(url.pathname) || url.pathname.startsWith('/weekly/'))) {
    const name = weeklyAliases.includes(url.pathname) ? 'index.html' : url.pathname.slice('/weekly/'.length);
    const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.txt':'text/plain', '.md':'text/markdown', '.csv':'text/csv', '.zip':'application/zip' };
    const mime = types[path.extname(name)];
    if (!/^[a-zA-Z0-9-]+\.(html|css|js|json|png|svg|txt|md|csv|zip)$/.test(name) || !mime) { sendJson(res,404,{ok:false,error:'Route not found'}); return; }
    const target = path.join(__dirname,'weekly',name);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { sendJson(res,404,{ok:false,error:'Route not found'}); return; }
    res.writeHead(200,{'Content-Type':mime + (['image/png','application/zip'].includes(mime)?'':'; charset=utf-8'),'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(target).pipe(res);return;
  }

  // Serve only the public November campaign assets from this fixed directory.
  if (req.method === 'GET' && (url.pathname === '/november' || url.pathname.startsWith('/november/'))) {
    const name = url.pathname === '/november' || url.pathname === '/november/' ? 'index.html' : url.pathname.slice('/november/'.length);
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.csv': 'text/csv', '.zip': 'application/zip' };
    const type = mime[path.extname(name)];
    if (!/^[a-zA-Z0-9-]+\.(html|css|js|json|svg|png|csv|zip)$/.test(name) || !type) {
      sendJson(res, 404, { ok: false, error: 'Route not found' }); return;
    }
    const target = path.join(__dirname, 'november', name);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      sendJson(res, 404, { ok: false, error: 'Route not found' }); return;
    }
    res.writeHead(200, { 'Content-Type': type + (['image/png', 'application/zip'].includes(type) ? '' : '; charset=utf-8'), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(target).pipe(res); return;
  }

  if (req.method === 'GET' && (url.pathname === '/studio' || url.pathname === '/mozakrawi-content-studio.html')) {
    if (!fs.existsSync(HTML_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ملف الاستوديو غير موجود بعد.');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(HTML_PATH).pipe(res);
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/hawamesh' || url.pathname === '/reader' || url.pathname === '/mozakrawi-hawamesh-reader.html')) {
    if (!fs.existsSync(HAWAMESH_HTML_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ملف قارئ الهوامش غير موجود بعد.');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(HAWAMESH_HTML_PATH).pipe(res);
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/hawamesh.md' || url.pathname === '/mozakrawi-hawamesh-novella.md')) {
    if (!fs.existsSync(HAWAMESH_MD_PATH)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(HAWAMESH_MD_PATH).pipe(res);
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/series' || url.pathname === '/mozakrawi-baad-awal-matab-november.html')) {
    if (!fs.existsSync(SERIES_HTML_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ملف سلسلة نوفمبر غير موجود بعد.');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(SERIES_HTML_PATH).pipe(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/content-bank.md') {
    if (!fs.existsSync(MD_PATH)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mozakrawi-content-bank.md"'
    });
    fs.createReadStream(MD_PATH).pipe(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const key = getEffectiveApiKey('');
    sendJson(res, 200, {
      ok: true,
      serverMode: true,
      hasEnvKey: Boolean(key),
      maskedEnvKey: key ? `${key.slice(0, 5)}••••••${key.slice(-4)}` : null
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/save-key') {
    try {
      const body = await readJsonBody(req);
      saveApiKeyToLocalEnv(body.apiKey || '');
      const key = getEffectiveApiKey('');
      sendJson(res, 200, {
        ok: true,
        hasEnvKey: Boolean(key),
        maskedEnvKey: key ? `${key.slice(0, 5)}••••••${key.slice(-4)}` : null
      });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/user-data') {
    sendJson(res, 200, { ok: true, data: readUserData() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/user-data') {
    try {
      const body = await readJsonBody(req);
      writeUserData(body);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/interactions') {
    try {
      const headerKey = req.headers['x-studio-api-key'];
      const apiKey = getEffectiveApiKey(Array.isArray(headerKey) ? headerKey[0] : headerKey);
      if (!apiKey) {
        sendJson(res, 401, {
          ok: false,
          error: 'مفتاح Gemini API غير موجود. افتح زر «🔑 إعدادات الـ API» فوق وحط المفتاح الأول.'
        });
        return;
      }

      const payload = await readJsonBody(req);
      const editorialRules = 'قواعد تحرير ملزمة: لا تطلب من الطالب إنشاء جدول أو تعديله أو إعادة توزيع وقته. لا تضف ساعات أو واجبات أو أسئلة إضافية أو تغييرًا كبيرًا في المذاكرة. شجّعه على تنفيذ الموجود بالفعل في جدوله بأفضل أداء متاح حسب طاقته. أي تصرّف صغير داخل المهمة الحالية. لا سهر تعويضي، لا إذلال أو تخويف أو ضمان درجات أو تشخيص نفسي. الراحة ليست مشروطة بالإنجاز. عند تعارض أمثلة قديمة مع هذه القواعد، التزم بهذه القواعد.';
      payload.system_instruction = (typeof payload.system_instruction === 'string' ? payload.system_instruction + '\n\n' : '') + editorialRules;
      const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
          'Api-Revision': '2026-05-20'
        },
        body: JSON.stringify(payload)
      });

      const respText = await upstream.text();
      res.writeHead(upstream.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(respText);
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message || 'فشل الاتصال بخادم Gemini API' });
    }
    return;
  }

  // Safe static file server for local downloads (CSV, MD, HTML, ICS)
  if (req.method === 'GET') {
    const safeName = path.basename(url.pathname);
    const forbidden = ['.env', '.git', 'node_modules', 'package.json'];
    if (safeName && !forbidden.some(f => safeName.toLowerCase().includes(f))) {
      const targetPath = path.join(__dirname, safeName);
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
        const ext = path.extname(safeName).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.csv': 'text/csv; charset=utf-8',
          '.md': 'text/markdown; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.ics': 'text/calendar; charset=utf-8',
          '.png': 'image/png'
        };
        const cType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': cType, 'Cache-Control': 'no-cache' });
        fs.createReadStream(targetPath).pipe(res);
        return;
      }
    }
  }

  sendJson(res, 404, { ok: false, error: 'Route not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 استوديو محتوى مذاكراوي شغال دلوقتي على الرابط:`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`🔒 وضع الأمان مفعل: المفتاح يُحفظ محلياً في .env (محمي بـ .gitignore) وكل البوستات المولدة بتتحفظ في studio-user-data.json`);
});
