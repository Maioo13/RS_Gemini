const fs = require('fs');
const glob = require('glob');

const newBannerHtml = `  <div id="cookie-banner" class="fixed bottom-0 left-0 right-0 w-full bg-white/80 backdrop-blur-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50 transform transition-transform duration-500 ease-in-out translate-y-full">
    <div class="max-w-screen-lg mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[#1c110d]">
      <div class="text-center md:text-left">
        <p class="font-bold">Zero Tracker Policy 🛡️</p>
        <p class="text-sm text-[#9b604b]">
          Questo sito rispetta la tua privacy: utilizziamo esclusivamente storage locali strettamente necessari al funzionamento tecnico. Nessun dato viene usato per la profilazione.
        </p>
      </div>
      <div class="flex-shrink-0 flex items-center gap-3">
        <button id="cookie-accept" class="px-5 py-2 text-sm font-bold text-white bg-[#e63f11] rounded-full hover:opacity-90 transition-opacity">
          Ho capito
        </button>
      </div>
    </div>
  </div>`;

const htmlFiles = glob.sync('*.html');
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/<div id="cookie-banner"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, newBannerHtml);
  
  fs.writeFileSync(file, content);
});

// Update js/cookie-consent.js
let jsContent = fs.readFileSync('js/cookie-consent.js', 'utf8');
jsContent = jsContent.replace(/const rejectBtn = document\.getElementById\('cookie-reject'\);/g, '');
jsContent = jsContent.replace(/if \(rejectBtn\) {[\s\S]*?}/g, '');
fs.writeFileSync('js/cookie-consent.js', jsContent);

console.log('Cookie banner fixed');
