import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '.artifacts');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const candidates = [
  'coverage',
  ...walk('packages').filter((p) => /(^|\/)dist($|\/)/.test(p) || /(^|\/)coverage($|\/)/.test(p)),
  ...walk('apps').filter((p) => /(^|\/)dist($|\/)/.test(p) || /(^|\/)coverage($|\/)/.test(p)),
].filter(Boolean);

for (const rel of candidates) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log(`Collected artifacts in ${outDir}`);

function walk(start) {
  const abs = path.join(root, start);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    const rel = path.relative(root, current);
    if (stat.isDirectory()) {
      out.push(rel);
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
    }
  }
  return out;
}
