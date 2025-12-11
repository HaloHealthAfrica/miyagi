// Cross-platform script runner for Vercel setup
const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';
const script = isWindows ? 'powershell -File scripts/setup-vercel.ps1' : 'bash scripts/setup-vercel.sh';

try {
  execSync(script, { stdio: 'inherit' });
} catch (error) {
  console.error('Setup failed:', error.message);
  process.exit(1);
}

