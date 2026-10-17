import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
const ui=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Encode the selected Imagegen originals; the application only uses project AVIFs.
const manifest=path.resolve(process.argv[2] ?? path.join(ui,'../output/navigation-icons/generated-sources.json'));
const sources=JSON.parse(await fs.readFile(manifest,'utf8'));
const target=path.join(ui,'public/images/navigation-dott-simple');
await fs.mkdir(target,{recursive:true});
for(const [key,source] of Object.entries(sources)) {
  if(!/^[a-z0-9-]+$/.test(key)) throw new Error(`Invalid asset name: ${key}`);
  await sharp(source).resize(192,192).avif({quality:85,effort:7}).toFile(path.join(target,`${key}.avif`));
}
console.log(`Encoded ${Object.keys(sources).length} cartoon navigation AVIFs.`);
