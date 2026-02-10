const fs = require('fs');
const path = require('path');

// Configuration
const PAGES_DIR = path.join(__dirname, 'pages');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const OUTPUT_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(OUTPUT_DIR, '_data');

// Ensure output directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

// Read JSON file
function readJson(filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error parsing JSON ${filePath}:`, error);
    return null;
  }
}

// Process pages directory
function processPages() {
  const pagesData = {};

  function processDirectory(dir, basePath = '') {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath, path.join(basePath, item));
      } else if (item.endsWith('.html')) {
        const urlSafe = item.replace('.html', '');
        const pageKey = path.join(basePath, urlSafe);
        const htmlContent = readFile(fullPath);

        // Try to find corresponding JSON config
        const jsonPath = path.join(path.dirname(fullPath), urlSafe.replace(/_/g, '/') + '.json');
        const jsonContent = readJson(jsonPath);

        pagesData[pageKey] = {
          html: htmlContent,
          config: jsonContent || {}
        };
      }
    });
  }

  processDirectory(PAGES_DIR);
  return pagesData;
}

// Process templates
function processTemplates() {
  const navPath = path.join(TEMPLATES_DIR, 'nav.html');
  const menuPath = path.join(TEMPLATES_DIR, 'menu.html');

  return {
    nav: readFile(navPath) || '',
    menu: readFile(menuPath) || ''
  };
}

// Copy static files
function copyStaticFiles() {
  const staticDir = path.join(__dirname, 'static');
  const dataDir = path.join(__dirname, 'data');

  // Copy static directory
  if (fs.existsSync(staticDir)) {
    copyDirectory(staticDir, path.join(OUTPUT_DIR, 'static'));
  }

  // Copy data directory
  if (fs.existsSync(dataDir)) {
    copyDirectory(dataDir, path.join(OUTPUT_DIR, 'data'));
  }

  // Copy index.html
  const indexHtml = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, path.join(OUTPUT_DIR, 'index.html'));
  }
}

function copyDirectory(src, dest) {
  ensureDir(dest);
  const items = fs.readdirSync(src);

  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy routes data
function copyRoutes() {
  const routesPath = path.join(__dirname, 'routes.mjs');
  const routesContent = readFile(routesPath);

  // Extract routes array from the file
  const routesMatch = routesContent.match(/export default\s+(\[[\s\S]*?\]);/);
  if (routesMatch) {
    const routesJson = routesMatch[1].replace(/(\w+):/g, '"$1":');
    const routes = JSON.parse(routesJson);

    fs.writeFileSync(
      path.join(DATA_DIR, 'routes.json'),
      JSON.stringify(routes, null, 2)
    );
  }
}

// Build function
function build() {
  console.log('🚀 Starting build process...');

  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }

  ensureDir(OUTPUT_DIR);
  ensureDir(DATA_DIR);

  console.log('📄 Processing pages...');
  const pagesData = processPages();
  fs.writeFileSync(
    path.join(DATA_DIR, 'pages.json'),
    JSON.stringify(pagesData, null, 2)
  );

  console.log('🧭 Processing templates...');
  const navData = processTemplates();
  fs.writeFileSync(
    path.join(DATA_DIR, 'navigation.json'),
    JSON.stringify(navData, null, 2)
  );

  console.log('🗂️  Copying routes...');
  copyRoutes();

  console.log('📁 Copying static files...');
  copyStaticFiles();

  console.log('✅ Build completed successfully!');
  console.log(`📦 Output directory: ${OUTPUT_DIR}`);
}

// Run build
build();