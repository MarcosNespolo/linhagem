/**
 * Gera os PNGs do app a partir dos SVGs em public/icons.
 * Uso: npm run icons (o sharp vem junto com o Next.js).
 */
import { copyFile, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const rounded = await readFile('public/icons/icon.svg')
const maskable = await readFile('public/icons/icon-maskable.svg')

const outputs = [
  { svg: rounded, size: 192, path: 'public/icons/icon-192.png' },
  { svg: rounded, size: 512, path: 'public/icons/icon-512.png' },
  { svg: maskable, size: 512, path: 'public/icons/icon-maskable-512.png' },
  // O iOS arredonda os cantos sozinho, então o ícone da Apple usa a versão sem cantos.
  { svg: maskable, size: 180, path: 'app/apple-icon.png' },
]

for (const { svg, size, path } of outputs) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path)
  console.log(`${path} (${size}x${size})`)
}

await copyFile('public/icons/icon.svg', 'app/icon.svg')
console.log('app/icon.svg')
