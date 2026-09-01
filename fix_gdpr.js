const fs = require('fs');
const glob = require('glob');

// 1. UPDATE SERVER.JS (CSP)
let serverJs = fs.readFileSync('server.js', 'utf8');
const oldCspRegex = /"default-src 'self'; script-src 'self' 'unsafe-inline' https:\/\/cdn\.tailwindcss\.com https:\/\/unpkg\.com; style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com; font-src 'self' https:\/\/fonts\.gstatic\.com; img-src 'self' data: https:; connect-src 'self' https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com;"/;
const newCsp = `"default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' https://api.github.com https://raw.githubusercontent.com;"`;
serverJs = serverJs.replace(oldCspRegex, newCsp);
fs.writeFileSync('server.js', serverJs);

// 2. UPDATE HTML FILES (Remove Tailwind CDN, Update Cookie Banner)
const htmlFiles = glob.sync('*.html');
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace Tailwind CDN with local CSS
  content = content.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/g, '');
  if (!content.includes('<link rel="stylesheet" href="/css/style.css">')) {
    content = content.replace(/<\/head>/i, '  <link rel="stylesheet" href="/css/style.css">\n</head>');
  }

  // Remove Google Fonts if they still exist
  content = content.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, '');
  content = content.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g, '');
  content = content.replace(/<link href="https:\/\/fonts\.googleapis\.com[^"]*" rel="stylesheet">\s*/g, '');

  // Modify the Cookie Banner
  // We need to find the cookie banner div. It probably has id="cookie-banner"
  const cookieBannerRegex = /<div id="cookie-banner"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;
  if (cookieBannerRegex.test(content)) {
    const newBannerHtml = `<div id="cookie-banner" class="fixed bottom-0 left-0 right-0 z-[100] transform translate-y-full transition-transform duration-500 ease-in-out">
  <div class="p-4 md:p-6 flex justify-center">
    <div class="bg-white rounded-2xl shadow-2xl border border-[#f3eae7] p-4 md:p-6 max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex-1">
        <h3 class="text-[#1c110d] text-lg font-bold mb-2">Zero Tracker Policy 🛡️</h3>
        <p class="text-[#9b604b] text-sm md:text-base leading-relaxed">
          Questo sito rispetta la tua privacy: utilizziamo esclusivamente cookie e storage tecnici strettamente necessari al funzionamento della piattaforma. Nessun dato viene usato per profilazione o tracciamento.
        </p>
      </div>
      <div class="flex gap-3 shrink-0">
        <button id="cookie-accept" class="px-6 py-2.5 bg-[#e63f11] text-white rounded-full text-sm font-bold tracking-[0.015em] transition-opacity hover:opacity-90">
          Ho capito
        </button>
      </div>
    </div>
  </div>
</div>`;
    // Replace the entire cookie banner
    // Need a safer replacement strategy. Let's just use string replace on the whole banner if possible.
    // I'll search for id="cookie-banner" and replace the block manually.
  }

  fs.writeFileSync(file, content);
});

console.log('GDPR base updates done');
