// Cross-platform script runner for deployment
const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';
const script = isWindows ? 'powershell -File scripts/deploy.ps1' : 'bash scripts/deploy.sh';

try {
  execSync(script, { stdio: 'inherit' });
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
}

