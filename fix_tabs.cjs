const fs = require('fs');

function fixAdminView() {
  let code = fs.readFileSync('components/AdminView.tsx', 'utf8');
  
  // Revert the bad sed replacements:
  code = code.replace(/id: 'NOTIFICATIONS', 'NEW_DRIVERS',/g, "id: 'NOTIFICATIONS',");
  code = code.replace(/activeTab === 'NOTIFICATIONS', 'NEW_DRIVERS' \?/g, "activeTab === 'NOTIFICATIONS' ?");
  code = code.replace(/AdminViewProps \{[\s\S]*?activeTab\?: 'DASHBOARD'.*?;/g, (match) => {
    if (!match.includes("'NEW_DRIVERS'")) {
       return match.replace(/'NOTIFICATIONS'/g, "'NOTIFICATIONS' | 'NEW_DRIVERS'");
    }
    return match;
  });

  // Now properly add the tab:
  code = code.replace(`        id: 'NOTIFICATIONS',\n        label: t("ar_43"),\n        icon: Bell\n      }, {`, `        id: 'NOTIFICATIONS',\n        label: t("ar_43"),\n        icon: Bell\n      }, {\n        id: 'NEW_DRIVERS',\n        label: isAr ? 'طلبات الطيارين' : 'New Drivers',\n        icon: UserPlus\n      }, {`);
  code = code.replace(`        id: 'NOTIFICATIONS',\n            label: t("ar_96"),\n            desc: t("ar_97"),\n            icon: Bell,\n            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',\n            adminOnly: true\n          }, {`, `        id: 'NOTIFICATIONS',\n            label: t("ar_96"),\n            desc: t("ar_97"),\n            icon: Bell,\n            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',\n            adminOnly: true\n          }, {\n            id: 'NEW_DRIVERS',\n            label: isAr ? 'طلبات الطيارين' : 'New Drivers',\n            desc: isAr ? 'مراجعة طلبات الانضمام الجديدة للطيارين' : 'Review new driver join applications',\n            icon: UserPlus,\n            color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20',\n            adminOnly: true\n          }, {`);
  code = code.replace(`activeTab === 'NOTIFICATIONS' ? t("ar_54") : t("ar_55")`, `activeTab === 'NOTIFICATIONS' ? t("ar_54") : activeTab === 'NEW_DRIVERS' ? (isAr ? 'طلبات الانضمام' : 'Join Requests') : t("ar_55")`);

  fs.writeFileSync('components/AdminView.tsx', code);
}

function fixAppTsx() {
  let code = fs.readFileSync('App.tsx', 'utf8');
  code = code.replace(/'NOTIFICATIONS', 'NEW_DRIVERS'/g, "'NOTIFICATIONS' | 'NEW_DRIVERS'");
  fs.writeFileSync('App.tsx', code);
}

fixAdminView();
fixAppTsx();
