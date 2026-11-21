/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function checkEnvFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`[-] ${label} (${filePath}) does not exist.`);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = dotenv.parse(content);
  console.log(`[+] Found ${label} (${filePath}) containing ${Object.keys(parsed).length} keys.`);

  const keysToCheck = [
    'DATABASE_URL',
    'DIRECT_URL',
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'AUTH_URL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  for (const k of keysToCheck) {
    const val = parsed[k];
    if (!val) {
      console.log(`    - ${k}: NOT CONFIGURED`);
    } else {
      let scheme = 'none';
      if (val.includes('://')) {
        scheme = val.split('://')[0];
      }
      const hasQuotes = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
      console.log(`    - ${k}: CONFIGURED (len=${val.length}, scheme=${scheme}, quotes=${hasQuotes})`);
    }
  }
  return parsed;
}

console.log("==================================================================");
console.log("         DEVHIRE PHASE B: SAFE ENVIRONMENT AUDIT                  ");
console.log("==================================================================");

const rootDir = path.resolve(__dirname, '..');
checkEnvFile(path.join(rootDir, '.env'), '.env');
checkEnvFile(path.join(rootDir, '.env.local'), '.env.local');

console.log("\n[+] Expected Production URL: https://devhire-ten.vercel.app (HTTPS strictly enforced)");
console.log("==================================================================");
