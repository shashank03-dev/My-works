// usage: node tools/render.mjs out.png [samples] [width]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out, samples = '16', w = '2000'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-watchdog'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + resolve('dist/index.html') + `?samples=${samples}&w=${w}`);
try { await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 0, polling: 500 }); }
catch (e) { console.error(errs.join('\n')); throw e; }
const e2 = await p.evaluate(() => window.__err); if (e2) { console.error(e2); process.exit(1); }
if (errs.length) { console.error(errs.join('\n')); }
const url = await p.evaluate(() => document.getElementById('c').toDataURL('image/png'));
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('rendered', out, 'in', Math.round(await p.evaluate(() => window.__ms)), 'ms');
await b.close();
