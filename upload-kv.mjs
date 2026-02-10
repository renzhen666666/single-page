import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DATA_DIR = join(__dirname, 'dist', '_data');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readJson(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

async function uploadToKV(key, value, env = 'preview') {
  try {
    const command = `wrangler kv:key put --path=- --namespace-id=${env === 'production' ? 'your-kv-namespace-id' : 'your-kv-preview-id'} ${key}`;
    
    log(`Uploading ${key}...`, 'blue');
    
    // Use execSync with stdin
    const result = execSync(`echo '${JSON.stringify(value)}' | ${command}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    log(`✓ ${key} uploaded successfully`, 'green');
    return true;
  } catch (error) {
    log(`✗ Error uploading ${key}: ${error.message}`, 'red');
    return false;
  }
}

async function uploadKVData(env = 'preview') {
  log('========================================', 'blue');
  log('Cloudflare KV Data Upload Script', 'blue');
  log('========================================', 'blue');
  log(`Environment: ${env}`, 'yellow');
  log('========================================\n', 'blue');

  // Upload pages.json
  const pagesData = readJson(join(DATA_DIR, 'pages.json'));
  if (pagesData) {
    await uploadToKV('pages.json', pagesData, env);
  }

  // Upload navigation.json
  const navData = readJson(join(DATA_DIR, 'navigation.json'));
  if (navData) {
    await uploadToKV('navigation.json', navData, env);
  }

  // Upload routes.json if it exists
  const routesPath = join(DATA_DIR, 'routes.json');
  if (require('fs').existsSync(routesPath)) {
    const routesData = readJson(routesPath);
    if (routesData) {
      await uploadToKV('routes.json', routesData, env);
    }
  }

  log('\n========================================', 'blue');
  log('Upload completed!', 'green');
  log('========================================', 'blue');
}

// Get environment from command line
const env = process.argv[2] || 'preview';

// Check if wrangler is installed
try {
  execSync('wrangler --version', { encoding: 'utf-8' });
} catch (error) {
  log('Error: wrangler CLI is not installed. Please install it with:', 'red');
  log('  npm install -g wrangler', 'yellow');
  process.exit(1);
}

// Run upload
uploadKVData(env).catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});