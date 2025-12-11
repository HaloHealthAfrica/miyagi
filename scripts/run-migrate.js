// Cross-platform script runner for database migrations
const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';
const script = isWindows ? 'powershell -File scripts/migrate-db.ps1' : 'bash scripts/migrate-db.sh';

try {
  execSync(script, { stdio: 'inherit' });
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}

