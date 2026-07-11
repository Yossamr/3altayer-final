const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.tsx', { ignore: 'node_modules/**' });
const arRegex = /[\u0600-\u06FF]/;
let allArabicStrings = new Set();

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  // simplistic approach: just match strings and jsx text
  // Since we want accuracy, let's use jscodeshift programmatically
}
