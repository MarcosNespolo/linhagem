/**
 * Gera uma página HTML com avatares em várias idades e aparências, para
 * revisar o desenho sem abrir o jogo.
 *
 * Uso: npm run gallery > galeria.html
 */
import { renderToStaticMarkup } from 'react-dom/server'
import {
  createRng,
  inheritAppearance,
  rollAppearance,
  type Appearance,
  type Gender,
} from '../src/engine'
import { Avatar } from '../src/ui/avatar/avatar'
import { avatarLook } from '../src/ui/avatar/look'

const AGES = [0, 1, 6, 10, 15, 25, 38, 50, 62, 72, 85]
/** Tamanho de cada avatar, em pixels. Use GALLERY_SIZE=140 para ver detalhes. */
const SIZE = Number(process.env.GALLERY_SIZE ?? 72)

type Row = { label: string; gender: Gender; appearance: Appearance; seed: string }

const rng = createRng(2026)
const rows: Row[] = []
for (let i = 0; i < 14; i++) {
  const gender: Gender = i % 2 === 0 ? 'f' : 'm'
  const appearance = rollAppearance(rng, gender)
  rows.push({ label: `${gender} #${i}`, gender, appearance, seed: `s${i}` })
}
const mother = rows[0].appearance
const father = rows[1].appearance
for (let i = 0; i < 4; i++) {
  const gender: Gender = i % 2 === 0 ? 'f' : 'm'
  rows.push({
    label: `filho ${i + 1} de #0 e #1`,
    gender,
    appearance: inheritAppearance(rng, mother, father, gender),
    seed: `k${i}`,
  })
}

const cells = rows
  .map((row) => {
    const avatars = AGES.map((age) =>
      renderToStaticMarkup(
        <figure style={{ margin: 0, textAlign: 'center' }}>
          <Avatar look={avatarLook(row.appearance, row.gender, age, row.seed)} size={SIZE} />
          <figcaption style={{ fontSize: 11 }}>{age}</figcaption>
        </figure>,
      ),
    ).join('')
    const traits = JSON.stringify(row.appearance)
    return `<section><h2>${row.label}</h2><p>${traits}</p><div class="row">${avatars}</div></section>`
  })
  .join('')

console.log(`<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui;background:#f2f5ec;margin:16px}
h2{font-size:13px;margin:12px 0 2px}p{font-size:10px;color:#666;margin:0 0 4px}
.row{display:flex;gap:8px;flex-wrap:wrap}
</style></head><body>${cells}</body></html>`)
