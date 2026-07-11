const fs = require('fs');
let code = fs.readFileSync('components/AdminView.tsx', 'utf8');
code = code.replace(/'NOTIFICATIONS', 'NEW_DRIVERS'/g, "'NOTIFICATIONS' | 'NEW_DRIVERS'");
fs.writeFileSync('components/AdminView.tsx', code);
