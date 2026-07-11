const fs = require('fs');
let code = fs.readFileSync('components/AdminView.tsx', 'utf8');
code = code.replace(/!\['SETTINGS', 'USERS_MGMT', 'FINANCIALS', 'CUSTOMERS', 'NOTIFICATIONS'\]\.includes\(tab\.id\)/g, "!['SETTINGS', 'USERS_MGMT', 'FINANCIALS', 'CUSTOMERS', 'NOTIFICATIONS', 'NEW_DRIVERS'].includes(tab.id)");
code = code.replace(/!\['SETTINGS', 'USERS_MGMT', 'FINANCIALS', 'CUSTOMERS', 'NOTIFICATIONS', 'NEW_DRIVERS'\]\.includes\(tab\.id\)/g, "!['SETTINGS', 'USERS_MGMT', 'FINANCIALS', 'CUSTOMERS', 'NOTIFICATIONS', 'NEW_DRIVERS'].includes(tab.id)");
fs.writeFileSync('components/AdminView.tsx', code);
