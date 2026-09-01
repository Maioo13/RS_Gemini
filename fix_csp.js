const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(
  /"default-src 'self'; script-src 'self' 'unsafe-inline' https:\/\/unpkg\.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com;"/,
  '"default-src \\'self\\'; script-src \\'self\\' \\'unsafe-inline\\' https://unpkg.com; style-src \\'self\\' \\'unsafe-inline\\'; font-src \\'self\\'; img-src \\'self\\' data: https:; connect-src \\'self\\' https://api.github.com https://raw.githubusercontent.com; frame-src \\'self\\' https://www.google.com;"'
);

fs.writeFileSync('server.js', content);
console.log("CSP updated!");
