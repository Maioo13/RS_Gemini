const fs = require('fs');
let data = JSON.parse(fs.readFileSync('data/translations.json', 'utf8'));
for (let lang in data) {
  if (typeof data[lang] === 'object') {
     for (let key in data[lang]) {
         if (key.startsWith('voice_') || key === 'nav_voice' || key === 'privacy_sec2_li2') {
             delete data[lang][key];
         }
     }
  } else {
     if (lang.startsWith('voice_') || lang === 'nav_voice' || lang === 'privacy_sec2_li2') {
        delete data[lang];
     }
  }
}
fs.writeFileSync('data/translations.json', JSON.stringify(data, null, 2));
