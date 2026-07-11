const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/requireRoles\(\["manager"\]\)/g, "requireRoles([\"ADMIN\"])");
code = code.replace(/requireRoles\(\["manager", "admin"\]\)/g, "requireRoles([\"ADMIN\", \"EMPLOYEE\"])");
fs.writeFileSync('server.ts', code);
