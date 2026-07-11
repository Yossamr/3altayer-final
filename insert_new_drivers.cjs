const fs = require('fs');
let code = fs.readFileSync('components/AdminView.tsx', 'utf8');

const im = `import { AdminNotificationsTab } from './AdminNotificationsTab';\nimport { NewDriversTab } from './NewDriversTab';`;
code = code.replace("import { AdminNotificationsTab } from './AdminNotificationsTab';", im);

const render = `
      {/* --- NEW DRIVERS TAB --- */}
      {activeTab === 'NEW_DRIVERS' && currentUser?.role === Role.ADMIN && <section className="space-y-4 px-2 animate-in fade-in slide-in-from-right-4">
              <NewDriversTab />
          </section>}
`;
code = code.replace("{/* --- SETTINGS TAB (Users & Zones) --- */}", render + "\n      {/* --- SETTINGS TAB (Users & Zones) --- */}");

fs.writeFileSync('components/AdminView.tsx', code);
