const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Fix 1: x-powered-by
if (!content.includes("app.disable('x-powered-by');")) {
  content = content.replace(/const app = express\(\);/, "const app = express();\napp.disable('x-powered-by');");
}

// Fix 2: Cache-Control in requireAdminAuth
if (!content.includes("res.setHeader('Cache-Control'")) {
  content = content.replace(/req\.adminUser = session\.user;\n\s*next\(\);/, `req.adminUser = session.user;\n  \n  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');\n  res.setHeader('Pragma', 'no-cache');\n  res.setHeader('Expires', '0');\n  \n  next();`);
}

// Fix 3: MIME type validation
const mimeMiddleware = `// ==============================================================================
// VALIDAZIONE MIME TYPE (API)
// ==============================================================================
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: 'Unsupported Media Type. Security policy requires application/json.'
      });
    }
  }
  next();
});

// ==============================================================================
// ROTTE AUTENTICAZIONE ADMIN`;

if (!content.includes("Unsupported Media Type")) {
  content = content.replace(/\/\/ ==============================================================================\n\/\/ ROTTE AUTENTICAZIONE ADMIN/, mimeMiddleware);
}

fs.writeFileSync('server.js', content);
console.log("Patched server.js successfully.");
