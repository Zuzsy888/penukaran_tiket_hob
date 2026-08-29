const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'config.js');
const url = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/PASTE_YOUR_WEB_APP_ID/exec';
const content = `window.__APPS_SCRIPT_URL__ = ${JSON.stringify(url)};\n`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log(`Generated ${targetPath} using APPS_SCRIPT_URL=${url}`);
