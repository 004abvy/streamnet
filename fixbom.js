const fs = require('fs');
const pkgPath = 'aPi server/package.json';
const pkgStr = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
fs.writeFileSync(pkgPath, pkgStr, 'utf8');
