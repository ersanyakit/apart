import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as icons from 'lucide-react';
import sharp from 'sharp';
const ui=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const definitions=JSON.parse(await fs.readFile(path.join(ui,'src/lib/navigation-icons.json'),'utf8'));
const target=path.join(ui,'public/images/navigation-flat');
await fs.mkdir(target,{recursive:true});
for(const name of new Set([...Object.values(definitions.pages),...Object.values(definitions.reports)])) {
  if(!icons[name]) throw new Error(`Unknown navigation icon: ${name}`);
  // AVIF alpha masks: a single clean contour, colored live by the selected theme.
  const svg=renderToStaticMarkup(React.createElement(icons[name],{size:32,strokeWidth:1.8,color:'#000000'}));
  await sharp(Buffer.from(svg),{density:576}).resize(128,128).avif({quality:90,effort:7}).toFile(path.join(target,`${name}.avif`));
}
console.log('Flat navigation AVIF assets generated.');
