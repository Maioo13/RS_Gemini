const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');

// Replace placeholder
adminHtml = adminHtml.replace(/placeholder="es\. lorymaiolo\/run-society-trieste"/g, 'placeholder="es. Owner/Repo"');

// Replace auto-fill value
adminHtml = adminHtml.replace(/ghRepoInput\.value = savedRepo \|\| 'lorymaiolo\/run-society-trieste';/g, "ghRepoInput.value = savedRepo || '';");

fs.writeFileSync('admin.html', adminHtml);
console.log("admin.html updated!");
