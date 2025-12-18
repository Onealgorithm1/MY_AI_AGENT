
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const packageJsonPath = path.join(rootDir, 'package.json');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const dependencies = new Set(Object.keys(packageJson.dependencies || {}));
const devDependencies = new Set(Object.keys(packageJson.devDependencies || {}));

const allDeps = new Set([...dependencies, ...devDependencies]);
// Built-in node modules to ignore
const builtins = new Set([
    'fs', 'path', 'os', 'http', 'https', 'crypto', 'events', 'util', 'url', 'child_process', 'stream', 'net', 'dgram', 'dns', 'zlib', 'readline', 'cluster', 'worker_threads', 'process', 'assert', 'buffer', 'console', 'constants', 'domain', 'module', 'punycode', 'querystring', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'v8', 'vm'
]);

const missingDeps = new Set();
const filesChecked = [];

function scanDir(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.js')) {
            checkFile(fullPath);
            filesChecked.push(fullPath);
        }
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match import x from 'pkg' or import 'pkg'
    const importRegex = /import\s+(?:[\w\s{},*]+from\s+)?['"]([^.\/][^'"]*)['"]/g;
    // Match const x = require('pkg')
    const requireRegex = /require\(['"]([^.\/][^'"]*)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        checkPackage(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
        checkPackage(match[1]);
    }
}

function checkPackage(pkgPath) {
    // Handle scoped packages like @google/generative-ai
    const parts = pkgPath.split('/');
    let pkgName = parts[0];
    if (pkgName.startsWith('@') && parts.length > 1) {
        pkgName = `${parts[0]}/${parts[1]}`;
    }

    if (!builtins.has(pkgName) && !allDeps.has(pkgName)) {
        missingDeps.add(pkgName);
    }
}

console.log('Scanning src directory...');
scanDir(srcDir);
console.log(`Checked ${filesChecked.length} files.`);

if (missingDeps.size > 0) {
    console.log('\n❌ MISSING DEPENDENCIES FOUND:');
    const missing = Array.from(missingDeps);
    console.log(missing.join('\n'));
    fs.writeFileSync('missing-deps-list.txt', JSON.stringify(missing, null, 2));
} else {
    console.log('\n✅ No missing dependencies found!');
    fs.writeFileSync('missing-deps-list.txt', '[]');
}

console.log('\n--- Environment Check ---');
console.log(`ENCRYPTION_KEY loaded: ${process.env.ENCRYPTION_KEY ? 'YES (Length: ' + process.env.ENCRYPTION_KEY.length + ')' : 'NO'}`);
