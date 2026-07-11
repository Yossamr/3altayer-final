const fs = require('fs');

let code = fs.readFileSync('services/LanguageContext.tsx', 'utf8');

code = code.replace(
    /const saved = localStorage\.getItem\('language'\);\s*if \(saved === 'en' \|\| saved === 'ar'\) \{\s*return saved;\s*\}\s*\/\/ Check browser locale or default to 'ar'\s*if \(typeof navigator !== 'undefined'\) \{\s*const locale = navigator\.language \|\| '';\s*if \(locale\.startsWith\('en'\)\) \{\s*return 'en';\s*\}\s*\}/,
    `const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'ar') {
      return saved;
    }`
);

fs.writeFileSync('services/LanguageContext.tsx', code);
console.log('Done.');
