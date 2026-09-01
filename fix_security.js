const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. sameSite: 'strict'
content = content.replace(/sameSite: isSecure \? 'none' : 'lax',/g, "sameSite: 'strict',");

// 2. Sostituire la logica di express.static con una Whitelist rigorosa
const oldStatic = `// Serve static assets
app.use(express.static(path.join(__dirname, '.'), {
  dotfiles: 'deny',
  index: ['index.html'],
  setHeaders: (res, filePath) => {
    const normalized = path.normalize(filePath);
    if (
      normalized.endsWith('.env') ||
      normalized.endsWith('.env.example') ||
      normalized.endsWith('server.js') ||
      normalized.endsWith('package.json') ||
      normalized.endsWith('bun.lock') ||
      normalized.endsWith('.backup.json') ||
      normalized.endsWith('.tmp')
    ) {
      res.status(403).end('Access Denied');
    }
  }
}));`;

const newStatic = `// ==============================================================================
// WHITELIST MODELLO (SICUREZZA FILE STATICI)
// ==============================================================================
// Solo questi file/cartelle possono essere letti pubblicamente. Tutto il resto (package.json, server.js, ecc.) è bloccato.
const PUBLIC_DIRS = ['/css/', '/js/', '/icons/', '/fonts/', '/data/'];
const PUBLIC_FILES = [
  '/404.html', '/admin.html', '/CalendarioGare.html', '/calendario.html',
  '/chiSiamo.html', '/contatti.html', '/esoneri.html', '/grazie.html',
  '/index.html', '/privacy.html', '/fonts.css', '/input.css',
  '/robots.txt', '/site.webmanifest', '/'
];

app.use((req, res, next) => {
  // Le API hanno le loro route e i loro controlli, le lasciamo passare
  if (req.path.startsWith('/api/')) return next();

  // Controllo Whitelist
  const isAllowedFile = PUBLIC_FILES.includes(req.path);
  const isAllowedDir = PUBLIC_DIRS.some(dir => req.path.startsWith(dir));

  if (!isAllowedFile && !isAllowedDir) {
    return res.status(403).end('Access Denied - Not in Whitelist');
  }

  // Prevenzione ulteriore: non permettiamo di scaricare JSON di backup temporanei anche dentro le cartelle whitelistate
  if (req.path.endsWith('.backup.json') || req.path.endsWith('.tmp')) {
    return res.status(403).end('Access Denied');
  }

  next();
});

// Serve static assets (ora blindato dalla Whitelist soprastante)
app.use(express.static(path.join(__dirname, '.'), {
  dotfiles: 'deny',
  index: ['index.html']
}));`;

content = content.replace(oldStatic, newStatic);

fs.writeFileSync('server.js', content);
console.log('Security updated!');
