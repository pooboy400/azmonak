#!/usr/bin/env node
/* استخراج SVG داخلی آیکون‌های lucide-react از node_modules و ساخت sprite
 * خروجی: scripts/design-pdf-parts/icon-sprite.html (فرگمنت <symbol>) */
const fs = require('fs');
const path = require('path');

const DIR = '/home/z/my-project/node_modules/lucide-react/dist/esm/icons';
const OUT = '/home/z/my-project/scripts/design-pdf-parts/icon-sprite.html';

// نام فایل آیکون -> شناسه symbol
const WANT = {
  'home': 'i-home', 'trophy': 'i-trophy', 'users': 'i-users', 'user': 'i-user',
  'plus': 'i-plus', 'x': 'i-x', 'check': 'i-check', 'chevron-left': 'i-chev-l',
  'chevron-right': 'i-chev-r', 'chevron-down': 'i-chev-d', 'arrow-left': 'i-arrow-l',
  'arrow-up': 'i-arrow-up', 'arrow-down': 'i-arrow-dn', 'eye': 'i-eye', 'flame': 'i-flame',
  'clock': 'i-clock', 'target': 'i-target', 'sparkles': 'i-sparkles', 'star': 'i-star',
  'shield-check': 'i-shield', 'medal': 'i-medal', 'crown': 'i-crown',
  'trending-up': 'i-trend', 'book-open': 'i-book', 'pen-line': 'i-pen',
  'languages': 'i-lang', 'scroll-text': 'i-scroll', 'landmark': 'i-landmark',
  'calculator': 'i-calc', 'atom': 'i-atom', 'flask-conical': 'i-flask',
  'dna': 'i-dna', 'mountain': 'i-mountain', 'globe': 'i-globe', 'brain': 'i-brain',
  'sigma': 'i-sigma', 'leaf': 'i-leaf', 'moon-star': 'i-moonstar', 'calendar': 'i-cal',
  'list-checks': 'i-listcheck', 'graduation-cap': 'i-grad', 'phone': 'i-phone',
  'mail': 'i-mail', 'circle-help': 'i-help', 'scale': 'i-scale', 'file-text': 'i-file',
  'share-2': 'i-share', 'thumbs-up': 'i-thumbs', 'send': 'i-send',
  'message-circle': 'i-msg', 'log-out': 'i-logout', 'settings': 'i-settings',
  'pencil': 'i-pencil', 'refresh-cw': 'i-refresh', 'percent': 'i-percent',
  'flag': 'i-flag', 'shapes': 'i-shapes', 'sun': 'i-sun'
};

function resolveFile(file) {
  // برخی فایل‌ها فقط alias هستند: export { default } from './house.js'
  let src = fs.readFileSync(path.join(DIR, file + '.js'), 'utf8');
  const re = src.match(/export \{ default \} from '\.\/([a-z0-9-]+)\.js'/);
  return re ? re[1] : file;
}

function extractInner(file) {
  const src = fs.readFileSync(path.join(DIR, resolveFile(file) + '.js'), 'utf8');
  const m = src.match(/const __iconNode = (\[[\s\S]*?\]);\s*\n/);
  if (!m) throw new Error('node array not found in ' + file);
  const nodes = Function('"use strict"; return (' + m[1] + ')')();
  return nodes.map(([tag, attrs]) => {
    const a = Object.entries(attrs)
      .filter(([k]) => k !== 'key')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `<${tag} ${a}/>`;
  }).join('');
}

const symbols = [];
const missing = [];
for (const [file, id] of Object.entries(WANT)) {
  const p = path.join(DIR, file + '.js');
  if (!fs.existsSync(p)) { missing.push(file); continue; }
  symbols.push(`<symbol id="${id}" viewBox="0 0 24 24">${extractInner(file)}</symbol>`);
}

const sprite = `<!-- sprite آیکون‌های lucide (استخراج دقیق از lucide-react v0.525) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
${symbols.join('\n')}
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, sprite + '\n');
console.log('symbols:', symbols.length, '| missing:', missing.length ? missing.join(',') : 'none');
console.log('out:', OUT);
