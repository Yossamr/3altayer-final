const fs = require('fs');
let code = fs.readFileSync('components/AdminView.tsx', 'utf8');
code = code.replace("{activeTab === 'NOTIFICATIONS', 'NEW_DRIVERS' && currentUser?.role === Role.ADMIN && <section className=\"space-y-4 px-2 animate-in fade-in slide-in-from-right-4\">", "{activeTab === 'NOTIFICATIONS' && currentUser?.role === Role.ADMIN && <section className=\"space-y-4 px-2 animate-in fade-in slide-in-from-right-4\">");
fs.writeFileSync('components/AdminView.tsx', code);
