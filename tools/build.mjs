import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const frag = readFileSync('src/scene.frag', 'utf8').replace('//@OUTLINES@', readFileSync('tools/outlines.glsl', 'utf8') + readFileSync('tools/stones.glsl', 'utf8'));
const html = readFileSync('src/template.html', 'utf8').replace('/*@FRAG@*/', () => frag);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('built dist/index.html', html.length, 'bytes');
