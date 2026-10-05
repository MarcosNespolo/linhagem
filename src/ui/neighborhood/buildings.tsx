/**
 * Desenhos do bairro em SVG, no traço chapado dos avatares. Cada prédio tem a
 * base no ponto (0, 0), a fachada de frente e o telhado e a lateral direita
 * aparecendo de leve, como num mapa ilustrado visto de cima. A variante do
 * lote (10 × fileira + posição na fileira) escolhe o modelo e as cores, e o
 * mesmo lote sai sempre igual.
 */
import type { ReactNode } from 'react'
import type { PropertyId } from '@/content/properties'
import { mixColor, shade } from '../avatar/palette'

/** Profundidade do desenho: o quanto o telhado e a lateral aparecem. */
export const DEPTH = { x: 6, y: -6 }
const D = DEPTH

/** Paredes em tons de casa brasileira. */
const WALLS = [
  '#F2C9A8',
  '#F6E0A4',
  '#BFD9C9',
  '#C9D9EC',
  '#EBC6CD',
  '#D9CBE8',
  '#F0D8B8',
  '#B9DDD9',
] as const

/** Telhas: barro, barro escuro, marrom e cinza. */
const ROOFS = ['#C7643F', '#B5523A', '#9A6A4F', '#7D8A96'] as const

/** Portas de madeira e pintadas. */
const DOORS = ['#8B6B4C', '#3F7F6E', '#3E5C76', '#B5523A'] as const

export const COLORS = {
  grass: '#DCE7CF',
  grassDark: '#CBDABB',
  yard: '#E4ECD8',
  paved: '#ECE7DD',
  pavedLine: '#E2DCD0',
  sidewalk: '#EFEAE0',
  sidewalkLine: '#E0D9CC',
  road: '#C9C4B8',
  roadLine: '#F7F3EA',
  median: '#C3D6B0',
  dirt: '#DCC8A0',
  dirtDark: '#C9B38A',
  concrete: '#E7E2D7',
  parapet: '#D3CCBF',
  glass: '#9EC3DE',
  glassDark: '#6F95B6',
  frame: '#FFFFFF',
  bark: '#8B6B4C',
  tank: '#3F7FB5',
  iron: '#5E6B62',
  shadow: 'rgba(31, 42, 35, 0.13)',
  ink: '#1F2A23',
  rose: '#C94C66',
  gold: '#A06C10',
  orange: '#E8A33D',
}

/** Cor de parede do lote: os vizinhos do lado e o de cima nunca saem iguais. */
function tone(variant: number, salt = 0): string {
  return WALLS[(variant * 3 + Math.floor(variant / 10) + salt) % WALLS.length]
}

/** Caixa com fachada, lateral direita e topo. `x`, `y`: canto de baixo à esquerda da fachada. */
function Block({
  x,
  y,
  w,
  h,
  front,
  top = mixColor(front, '#FFFFFF', 0.35),
  side = shade(front, 0.14),
  depth = D,
}: {
  x: number
  y: number
  w: number
  h: number
  front: string
  top?: string
  side?: string
  depth?: { x: number; y: number }
}) {
  const t = y - h
  return (
    <g>
      <polygon
        points={`${x + w},${y} ${x + w + depth.x},${y + depth.y} ${x + w + depth.x},${t + depth.y} ${x + w},${t}`}
        fill={side}
      />
      <polygon
        points={`${x},${t} ${x + depth.x},${t + depth.y} ${x + w + depth.x},${t + depth.y} ${x + w},${t}`}
        fill={top}
      />
      <rect x={x} y={t} width={w} height={h} fill={front} />
    </g>
  )
}

/** Janelas em grade na fachada, com moldura branca. */
function Windows({
  x,
  y,
  cols = 1,
  rows = 1,
  w,
  h,
  gapX = 0,
  gapY = 0,
  glass = COLORS.glass,
}: {
  x: number
  y: number
  cols?: number
  rows?: number
  w: number
  h: number
  gapX?: number
  gapY?: number
  glass?: string
}) {
  const items: ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * (w + gapX)
      const wy = y + r * (h + gapY)
      items.push(
        <g key={`${r}-${c}`}>
          <rect
            x={wx - 0.8}
            y={wy - 0.8}
            width={w + 1.6}
            height={h + 1.6}
            rx={0.8}
            fill={COLORS.frame}
          />
          <rect x={wx} y={wy} width={w} height={h} fill={glass} />
          <rect x={wx} y={wy} width={w * 0.38} height={h} fill="#FFFFFF" opacity={0.28} />
        </g>,
      )
    }
  }
  return <g>{items}</g>
}

/** Sombra no chão, embaixo do prédio. */
function Shadow({ w, x = 0 }: { w: number; x?: number }) {
  return <ellipse cx={x + D.x / 2} cy={1.5} rx={w / 2 + 6} ry={3.6} fill={COLORS.shadow} />
}

/** Mureta no alto do prédio. */
function Parapet({ x, w, h }: { x: number; w: number; h: number }) {
  return <rect x={x - 1} y={-h - 1.5} width={w + 2} height={2} fill={COLORS.parapet} />
}

/** Caixa-d'água azul no telhado, como nos prédios brasileiros. */
function WaterTank({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 4} y={y - 6} width={8} height={6} fill={COLORS.tank} />
      <ellipse cx={x} cy={y} rx={4} ry={1.6} fill={shade(COLORS.tank, 0.12)} />
      <ellipse cx={x} cy={y - 6} rx={4} ry={1.6} fill={mixColor(COLORS.tank, '#FFFFFF', 0.3)} />
    </g>
  )
}

function Door({
  x,
  y,
  w = 6,
  h = 10,
  color = DOORS[0],
}: {
  x: number
  y: number
  w?: number
  h?: number
  color?: string
}) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={0.8} fill={color} />
      <circle cx={x + w / 2 - 1.4} cy={y - h / 2} r={0.6} fill="#F6E0A4" />
    </g>
  )
}

/** Muro baixo com portão de grade na frente do lote. */
function Muro({ x, w, gate, color }: { x: number; w: number; gate: number; color: string }) {
  const h = 6
  const gateW = 11
  const bars: ReactNode[] = []
  for (let bx = gate - gateW / 2 + 1.2; bx < gate + gateW / 2; bx += 1.8) {
    bars.push(
      <rect key={bx} x={bx - 0.35} y={-h - 1.5} width={0.7} height={h + 1.5} fill={COLORS.iron} />,
    )
  }
  const cap = shade(color, 0.12)
  return (
    <g>
      <rect x={x} y={-h} width={gate - gateW / 2 - x} height={h} fill={color} />
      <rect x={gate + gateW / 2} y={-h} width={x + w - gate - gateW / 2} height={h} fill={color} />
      <rect x={x - 0.5} y={-h - 1} width={gate - gateW / 2 - x + 0.5} height={1.4} fill={cap} />
      <rect
        x={gate + gateW / 2}
        y={-h - 1}
        width={x + w - gate - gateW / 2 + 0.5}
        height={1.4}
        fill={cap}
      />
      {bars}
      <rect x={gate - gateW / 2} y={-h - 1.8} width={gateW} height={0.8} fill={COLORS.iron} />
    </g>
  )
}

type Drawing = {
  /** Largura da fachada, para a placa e o tapume. */
  width: number
  /** Do chão ao ponto mais alto do prédio, para pôr o alfinete em cima. */
  top: (variant: number) => number
  draw: (variant: number) => ReactNode
}

// Kitnets: prédio de dois andares, prédio estreito de três e vila térrea.

function KitnetDuplex({ front }: { front: string }) {
  const w = 44
  const h = 30
  const x = -w / 2
  return (
    <g>
      <Shadow w={w} />
      <Block x={x} y={0} w={w} h={h} front={front} top={COLORS.concrete} />
      <Parapet x={x} w={w} h={h} />
      <WaterTank x={x + w - 6} y={-h + D.y + 2} />
      <rect x={x} y={-h / 2 - 1} width={w} height={2} fill={shade(front, 0.1)} />
      <Windows x={x + 5} y={-h + 4} cols={3} w={7} h={6} gapX={6.5} />
      <Door x={x + 9} y={0} h={11} />
      <Door x={x + w - 9} y={0} h={11} color={DOORS[2]} />
      <Windows x={x + 18} y={-11} w={8} h={6} />
    </g>
  )
}

function KitnetTriplex({ front }: { front: string }) {
  const w = 36
  const h = 38
  const x = -w / 2
  const band = shade(front, 0.1)
  return (
    <g>
      <Shadow w={w} />
      <Block x={x} y={0} w={w} h={h} front={front} top={COLORS.concrete} />
      <Parapet x={x} w={w} h={h} />
      <WaterTank x={x + 9} y={-h + D.y + 2} />
      <rect x={x} y={-25.5} width={w} height={1.6} fill={band} />
      <rect x={x} y={-13} width={w} height={1.6} fill={band} />
      <Windows x={x + 5} y={-h + 4} cols={2} rows={2} w={9} h={6} gapX={8} gapY={6.5} />
      <rect x={-6} y={-12.4} width={12} height={1.8} rx={0.6} fill={shade(front, 0.22)} />
      <Door x={0} y={0} w={7} h={10} color={DOORS[1]} />
      <Windows x={x + 4} y={-9} w={6} h={5} />
      <Windows x={x + w - 10} y={-9} w={6} h={5} />
    </g>
  )
}

function KitnetVila({ front, variant }: { front: string; variant: number }) {
  const w = 46
  const h = 17
  const x = -w / 2
  const roof = '#B7C0C5'
  const unit = w / 3
  const ribs: ReactNode[] = []
  for (let i = 1; i < 8; i++) {
    const rx = x + (i * w) / 8
    ribs.push(
      <line
        key={i}
        x1={rx}
        y1={-h}
        x2={rx + D.x}
        y2={-h + D.y}
        stroke={shade(roof, 0.12)}
        strokeWidth={0.7}
      />,
    )
  }
  return (
    <g>
      <Shadow w={w} />
      <Block x={x} y={0} w={w} h={h} front={front} top={roof} />
      {ribs}
      <rect x={x - 1.5} y={-h - 1} width={w + 3} height={2.2} fill={shade(roof, 0.1)} />
      {[0, 1, 2].map((u) => (
        <g key={u}>
          {u > 0 ? (
            <rect
              x={x + u * unit - 0.4}
              y={-h + 1}
              width={0.8}
              height={h - 1}
              fill={shade(front, 0.12)}
            />
          ) : null}
          <Door
            x={x + u * unit + 5}
            y={0}
            w={5.4}
            h={10}
            color={DOORS[(variant + u) % DOORS.length]}
          />
          <Windows x={x + u * unit + 9.2} y={-11.5} w={4.6} h={4.6} />
        </g>
      ))}
    </g>
  )
}

const KITNET_TOPS = [42, 50, 24] as const

const kitnet: Drawing = {
  width: 44,
  top: (variant) => KITNET_TOPS[variant % 3],
  draw: (variant) => {
    const front = tone(variant)
    if (variant % 3 === 0) return <KitnetDuplex front={front} />
    if (variant % 3 === 1) return <KitnetTriplex front={front} />
    return <KitnetVila front={front} variant={variant} />
  },
}

// Apartamentos: de 4 a 6 andares, com varandas corridas ou uma por janela.

const FLOOR = 11

function apartmentFloors(variant: number): number {
  return 4 + ((variant + 1) % 3)
}

function apartmentHeight(variant: number): number {
  return 16 + apartmentFloors(variant) * FLOOR
}

function Apartment({ variant }: { variant: number }) {
  const w = 48
  const x = -w / 2
  const floors = apartmentFloors(variant)
  const h = apartmentHeight(variant)
  const front = tone(variant)
  const rail = mixColor(front, '#FFFFFF', 0.6)
  const balconies: ReactNode[] = []
  for (let f = 0; f < floors; f++) {
    const bottom = -13 - f * FLOOR
    if (variant % 2 === 0) {
      balconies.push(
        <rect
          key={f}
          x={x + 4}
          y={bottom - 2.6}
          width={w - 8}
          height={2.6}
          fill={shade(front, 0.16)}
        />,
      )
    } else {
      for (let c = 0; c < 3; c++) {
        balconies.push(
          <g key={`${f}-${c}`}>
            <rect x={x + 4.4 + c * 13.5} y={bottom - 2.8} width={12.2} height={2.8} fill={rail} />
            <rect
              x={x + 4.4 + c * 13.5}
              y={bottom - 2.8}
              width={12.2}
              height={0.7}
              fill={shade(front, 0.25)}
            />
          </g>,
        )
      }
    }
  }
  return (
    <g>
      <Shadow w={w} />
      <Block x={x} y={0} w={w} h={h} front={front} top={COLORS.concrete} />
      <Parapet x={x} w={w} h={h} />
      <Block
        x={x + 6}
        y={-h + D.y + 3}
        w={10}
        h={6}
        front={COLORS.parapet}
        depth={{ x: 3, y: -3 }}
      />
      <WaterTank x={x + w - 8} y={-h + D.y + 3} />
      <Windows
        x={x + 6}
        y={-22 - (floors - 1) * FLOOR}
        cols={3}
        rows={floors}
        w={9}
        h={6.4}
        gapX={4.5}
        gapY={FLOOR - 6.4}
      />
      {balconies}
      <rect x={-8} y={-12.2} width={16} height={1.8} fill={shade(front, 0.22)} />
      <Door x={0} y={0} w={9} h={10} color={COLORS.glassDark} />
      <Windows x={x + 4} y={-9} w={7} h={5} />
      <Windows x={x + w - 11} y={-9} w={7} h={5} />
      {variant % 3 === 0 ? (
        <Muro x={x - 3} w={w + 6} gate={0} color={mixColor(front, '#FFFFFF', 0.45)} />
      ) : null}
    </g>
  )
}

const apartamento: Drawing = {
  width: 48,
  top: (variant) => apartmentHeight(variant) + 11,
  draw: (variant) => <Apartment variant={variant} />,
}

// Casas: térrea com muro, sobrado e térrea com garagem.

/** Corpo de casa com telhado de duas águas e a empena virada para a rua. */
function GableHouse({
  x,
  w,
  h,
  roofH,
  front,
  roof,
}: {
  x: number
  w: number
  h: number
  roofH: number
  front: string
  roof: string
}) {
  const back = -6
  const cx = x + w / 2
  const peak = { x: cx, y: back - h - roofH }
  const left = { x: x - 3, y: back - h + 1 }
  const right = { x: x + w + 3, y: back - h + 1 }
  return (
    <g>
      <g transform={`translate(0 ${back})`}>
        <Block x={x} y={0} w={w} h={h} front={front} />
      </g>
      <polygon
        points={`${left.x},${left.y} ${peak.x},${peak.y} ${peak.x + D.x},${peak.y + D.y} ${left.x + D.x},${left.y + D.y}`}
        fill={mixColor(roof, '#FFFFFF', 0.12)}
      />
      <polygon
        points={`${peak.x},${peak.y} ${right.x},${right.y} ${right.x + D.x},${right.y + D.y} ${peak.x + D.x},${peak.y + D.y}`}
        fill={shade(roof, 0.14)}
      />
      <polygon
        points={`${left.x + 3},${left.y} ${peak.x},${peak.y + 3} ${right.x - 3},${right.y}`}
        fill={front}
      />
    </g>
  )
}

function CasaTerrea({ front, roof }: { front: string; roof: string }) {
  const w = 44
  const h = 21
  const x = -w / 2
  return (
    <g>
      <Shadow w={w} />
      <GableHouse x={x} w={w} h={h} roofH={14} front={front} roof={roof} />
      <circle cx={0} cy={-6 - h - 5} r={2.4} fill={COLORS.frame} />
      <circle cx={0} cy={-6 - h - 5} r={1.6} fill={COLORS.glass} />
      <Windows x={x + 5} y={-6 - h + 6} w={9} h={8} />
      <Windows x={x + w - 14} y={-6 - h + 6} w={9} h={8} />
      <Door x={0} y={-6} w={7} h={12} />
      <Muro x={x - 3} w={w + 6} gate={0} color={mixColor(front, '#FFFFFF', 0.5)} />
    </g>
  )
}

function Sobrado({ front, roof, variant }: { front: string; roof: string; variant: number }) {
  const w = 40
  const h = 32
  const x = -w / 2
  const base = -6
  return (
    <g>
      <Shadow w={w} />
      <GableHouse x={x} w={w} h={h} roofH={13} front={front} roof={roof} />
      <rect x={x} y={base - 16.5} width={w} height={1.6} fill={shade(front, 0.1)} />
      <Windows x={x + 5} y={base - h + 5} w={8} h={7} />
      <rect
        x={x + w - 15}
        y={base - h + 4}
        width={8}
        height={11}
        rx={0.6}
        fill={COLORS.glassDark}
      />
      <rect
        x={x + w - 18}
        y={base - 18.5}
        width={14}
        height={2.6}
        fill={mixColor(front, '#FFFFFF', 0.55)}
      />
      <Windows x={x + 5} y={base - 12} w={9} h={7} />
      <Door x={x + w - 11} y={base} w={7} h={11} color={DOORS[(variant + 1) % DOORS.length]} />
      <rect x={x - 3} y={-2.4} width={w + 6} height={2.4} rx={1} fill="#9DBF84" />
    </g>
  )
}

function CasaGaragem({ front, roof, variant }: { front: string; roof: string; variant: number }) {
  const body = 30
  const garage = 20
  const x = -(body + garage) / 2
  const gx = x + body
  const h = 21
  return (
    <g>
      <Shadow w={body + garage} />
      <GableHouse x={x} w={body} h={h} roofH={12} front={front} roof={roof} />
      <Windows x={x + 4} y={-6 - h + 6} w={8} h={8} />
      <Door x={x + body - 9} y={-6} w={7} h={12} />
      <g transform="translate(0 -6)">
        <Block x={gx} y={0} w={garage} h={13} front={shade(front, 0.04)} top={COLORS.concrete} />
        <rect x={gx + 2} y={-10.5} width={garage - 4} height={10.5} fill="#7A837D" />
        <Car x={gx + garage / 2} y={-1} variant={variant} scale={0.62} />
      </g>
      <rect x={gx + 1} y={-6} width={garage - 2} height={6} fill={COLORS.sidewalk} />
    </g>
  )
}

const CASA_TOPS = [47, 57, 45] as const

const casa: Drawing = {
  width: 50,
  top: (variant) => CASA_TOPS[variant % 3],
  draw: (variant) => {
    const front = tone(variant, 1)
    const roof = ROOFS[(variant + Math.floor(variant / 10)) % ROOFS.length]
    if (variant % 3 === 0) return <CasaTerrea front={front} roof={roof} />
    if (variant % 3 === 1) return <Sobrado front={front} roof={roof} variant={variant} />
    return <CasaGaragem front={front} roof={roof} variant={variant} />
  },
}

// Comércio e o centro.

const SALA_GLASS = ['#8FB4D3', '#93C2C0', '#A3B5D6', '#9CC0AE'] as const

function salaHeight(variant: number): number {
  return 80 + (variant % 3) * 10
}

function Sala({ variant }: { variant: number }) {
  const w = 50
  const h = salaHeight(variant)
  const x = -w / 2
  const glass = SALA_GLASS[(variant * 3) % SALA_GLASS.length]
  const glassH = h - 16
  const floors = Math.round(glassH / 9)
  return (
    <g>
      <Shadow w={w} />
      <Block x={x} y={0} w={w} h={h} front="#E9EEF2" top="#F4F6F8" side="#C8D2DB" />
      <rect x={x + 3} y={-h + 4} width={w - 6} height={glassH} fill={glass} />
      {[1, 2, 3].map((c) => (
        <rect
          key={c}
          x={x + 3 + c * ((w - 6) / 4) - 0.6}
          y={-h + 4}
          width={1.2}
          height={glassH}
          fill="#FFFFFF"
          opacity={0.85}
        />
      ))}
      {Array.from({ length: floors - 1 }, (_, r) => (
        <rect
          key={r}
          x={x + 3}
          y={-h + 4 + (r + 1) * (glassH / floors) - 0.5}
          width={w - 6}
          height={1}
          fill="#FFFFFF"
          opacity={0.7}
        />
      ))}
      <polygon
        points={`${x + 3},${-h + 4} ${x + 18},${-h + 4} ${x + 3},${-h + 30}`}
        fill="#FFFFFF"
        opacity={0.18}
      />
      <rect x={x + 6} y={-11} width={w - 12} height={11} fill={COLORS.glassDark} />
      <rect x={x + 4} y={-13} width={w - 8} height={2} fill="#C8D2DB" />
      {variant % 2 === 0 ? (
        <rect x={x + w / 2 - 0.5} y={-h - 12} width={1} height={8} fill="#9AA7B2" />
      ) : (
        <Block x={x + 8} y={-h + D.y + 2} w={14} h={5} front="#D5DCE2" depth={{ x: 3, y: -3 }} />
      )}
    </g>
  )
}

const sala: Drawing = {
  width: 50,
  top: (variant) => salaHeight(variant) + 12,
  draw: (variant) => <Sala variant={variant} />,
}

const AWNINGS = ['#C94C66', '#3F8A8C', '#E3B04B', '#56739E', '#5E9C7A'] as const
const SHOP_NAMES = [
  'PADARIA',
  'FARMÁCIA',
  'MERCADO',
  'SORVETES',
  'LIVRARIA',
  'BAZAR',
  'FLORES',
  'CAFÉ',
] as const

function Loja({ variant }: { variant: number }) {
  const w = 50
  const x = -w / 2
  const upper = variant % 3 === 1
  const h = upper ? 42 : 30
  const front = tone(variant, 2)
  const awning = AWNINGS[(variant * 2) % AWNINGS.length]
  const name = SHOP_NAMES[variant % SHOP_NAMES.length]
  const stripes: ReactNode[] = []
  const n = 8
  const top = -20
  const bottom = -14.5
  for (let i = 0; i < n; i++) {
    const t0 = i / n
    const t1 = (i + 1) / n
    const ax = (t: number) => x + 2 + t * (w - 4)
    const bx = (t: number) => x - 1 + t * (w + 2)
    stripes.push(
      <polygon
        key={i}
        points={`${ax(t0)},${top} ${ax(t1)},${top} ${bx(t1)},${bottom} ${bx(t0)},${bottom}`}
        fill={i % 2 === 0 ? awning : '#FFFFFF'}
      />,
      <circle
        key={`s${i}`}
        cx={(bx(t0) + bx(t1)) / 2}
        cy={bottom}
        r={(w + 2) / n / 2}
        fill={i % 2 === 0 ? awning : '#FFFFFF'}
      />,
    )
  }
  return (
    <g>
      <Shadow w={w} />
      <Block x={x} y={0} w={w} h={h} front={front} top={COLORS.concrete} />
      {upper ? (
        <>
          <Parapet x={x} w={w} h={h} />
          <Windows x={x + 7} y={-h + 4} cols={3} w={8} h={6} gapX={6} />
          <rect x={x} y={-30.5} width={w} height={1.4} fill={shade(front, 0.12)} />
        </>
      ) : null}
      <rect x={x + 4} y={-28.5} width={w - 8} height={7.4} rx={1.2} fill={COLORS.frame} />
      <text
        x={0}
        y={-22.9}
        textAnchor="middle"
        fontSize={5.4}
        fontWeight={900}
        fill={shade(awning, 0.15)}
        letterSpacing={0.5}
      >
        {name}
      </text>
      {stripes}
      <rect x={x + 4} y={-12.5} width={26} height={11.5} fill={COLORS.glass} />
      <rect x={x + 4} y={-12.5} width={9} height={11.5} fill="#FFFFFF" opacity={0.28} />
      <rect x={x + 4} y={-3} width={26} height={2} fill={shade(front, 0.1)} />
      <Door x={x + w - 10} y={0} w={9} h={12} color={COLORS.glassDark} />
    </g>
  )
}

const loja: Drawing = {
  width: 52,
  top: (variant) => (variant % 3 === 1 ? 50 : 36),
  draw: (variant) => <Loja variant={variant} />,
}

const METALS = ['#9FB2C2', '#A9B9A8', '#B9A99A'] as const

function Galpao({ variant }: { variant: number }) {
  const w = 88
  const h = 24
  const x = -w / 2
  const arch = 14
  const metal = METALS[variant % METALS.length]
  const front = '#ECE6DA'
  const dx = D.x * 1.6
  const dy = D.y * 1.6
  const ribs: ReactNode[] = []
  for (let i = 1; i < 8; i++) {
    const t = i / 8
    const rx = x + t * w
    const ry = -h - arch * Math.sin(Math.PI * t)
    ribs.push(
      <line
        key={i}
        x1={rx}
        y1={ry}
        x2={rx + dx}
        y2={ry + dy}
        stroke={shade(metal, 0.12)}
        strokeWidth={0.8}
      />,
    )
  }
  const shutter = (sx: number) => (
    <g>
      <rect x={sx} y={-18} width={24} height={18} fill="#B8BEC2" />
      {[1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={sx} y={-18 + i * 3} width={24} height={0.8} fill="#9AA2A8" />
      ))}
      <rect x={sx - 1} y={-19.5} width={26} height={1.6} fill={shade(metal, 0.2)} />
    </g>
  )
  return (
    <g>
      <Shadow w={w} />
      <polygon
        points={`${x + w},0 ${x + w + dx},${dy} ${x + w + dx},${-h + dy} ${x + w},${-h}`}
        fill={shade(front, 0.14)}
      />
      <path
        d={`M${x},${-h} A${w / 2},${arch} 0 0 1 ${x + w},${-h} L${x + w + dx},${-h + dy} A${w / 2},${arch} 0 0 0 ${x + dx},${-h + dy} Z`}
        fill={metal}
      />
      {ribs}
      <path
        d={`M${x},0 L${x},${-h} A${w / 2},${arch} 0 0 1 ${x + w},${-h} L${x + w},0 Z`}
        fill={front}
      />
      <path
        d={`M${x + 3},${-h} A${w / 2 - 3},${arch - 2} 0 0 1 ${x + w - 3},${-h}`}
        fill="none"
        stroke={metal}
        strokeWidth={2}
      />
      <text
        x={0}
        y={-h - 2}
        textAnchor="middle"
        fontSize={7}
        fontWeight={900}
        fill={shade(metal, 0.25)}
      >
        {`0${(variant % 10) + 1}`}
      </text>
      {shutter(x + 10)}
      {shutter(x + 44)}
      <Door x={x + w - 9} y={0} w={7} h={11} color={COLORS.glassDark} />
    </g>
  )
}

const galpao: Drawing = {
  width: 92,
  top: () => 50,
  draw: (variant) => <Galpao variant={variant} />,
}

const TOWER_GLASS = ['#7FA7C9', '#86B5B2', '#9AA9C9', '#8DB0A0'] as const

function towerHeight(variant: number): number {
  return 110 + (variant % 3) * 14
}

function Predio({ variant }: { variant: number }) {
  const w = 52
  const h = towerHeight(variant)
  const x = -w / 2
  const glass = TOWER_GLASS[(variant * 3) % TOWER_GLASS.length]
  const bands: ReactNode[] = []
  for (let by = -h + 8; by < -14; by += 8) {
    bands.push(<rect key={by} x={x} y={by} width={w} height={1} fill="#FFFFFF" opacity={0.55} />)
  }
  return (
    <g>
      <Shadow w={w} />
      <Block
        x={x}
        y={0}
        w={w}
        h={h}
        front={glass}
        top={mixColor(glass, '#FFFFFF', 0.5)}
        side={shade(glass, 0.18)}
      />
      {bands}
      {[1, 2, 3].map((c) => (
        <rect
          key={c}
          x={x + c * (w / 4) - 0.5}
          y={-h}
          width={1}
          height={h - 12}
          fill="#FFFFFF"
          opacity={0.4}
        />
      ))}
      <polygon
        points={`${x},${-h} ${x + 20},${-h} ${x},${-h + 46}`}
        fill="#FFFFFF"
        opacity={0.16}
      />
      {variant % 2 === 0 ? (
        <>
          <Block
            x={x + 10}
            y={-h + D.y + 2}
            w={w - 20}
            h={10}
            front={mixColor(glass, '#FFFFFF', 0.25)}
            depth={{ x: 4, y: -4 }}
          />
          <rect x={x + w / 2 - 0.6} y={-h - 24} width={1.2} height={12} fill="#9AA7B2" />
          <circle cx={x + w / 2} cy={-h - 24} r={1.4} fill={COLORS.rose} />
        </>
      ) : (
        <>
          <Block
            x={x + 6}
            y={-h + D.y + 2}
            w={w - 12}
            h={6}
            front={mixColor(glass, '#FFFFFF', 0.3)}
            depth={{ x: 4, y: -4 }}
          />
          <Block
            x={x + 14}
            y={-h + D.y - 4}
            w={w - 28}
            h={6}
            front={mixColor(glass, '#FFFFFF', 0.4)}
            depth={{ x: 3, y: -3 }}
          />
        </>
      )}
      <rect x={x + 8} y={-12} width={w - 16} height={12} fill={shade(glass, 0.3)} />
      <rect x={x + 6} y={-14} width={w - 12} height={2} fill={mixColor(glass, '#FFFFFF', 0.4)} />
    </g>
  )
}

const predio: Drawing = {
  width: 58,
  top: (variant) => towerHeight(variant) + (variant % 2 === 0 ? 26 : 16),
  draw: (variant) => <Predio variant={variant} />,
}

/** Vaca malhada, para o pasto da fazenda. */
function Cow({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx={0.5} cy={0.6} rx={5} ry={1.2} fill={COLORS.shadow} />
      <rect x={-3.6} y={-3} width={0.9} height={3} fill="#5E5A54" />
      <rect x={2.4} y={-3} width={0.9} height={3} fill="#5E5A54" />
      <ellipse cx={0} cy={-4.4} rx={4.6} ry={2.6} fill="#FFFFFF" />
      <circle cx={-1.6} cy={-5} r={1.2} fill="#3B3632" />
      <circle cx={1.8} cy={-3.8} r={0.9} fill="#3B3632" />
      <ellipse cx={5.2} cy={-5.6} rx={1.8} ry={1.4} fill="#FFFFFF" />
      <circle cx={5.8} cy={-5.2} r={0.6} fill="#E7B3B3" />
    </g>
  )
}

function Fazenda({ variant }: { variant: number }) {
  const w = 140
  const depth = 46
  const x = -w / 2
  const crops = variant % 2 === 0 ? ['#9CC27B', '#86B067'] : ['#E2C25E', '#D4B04A']
  const field = 70
  const rows: ReactNode[] = []
  for (let i = 0; i < 8; i++) {
    const y0 = -4 - i * (depth / 8)
    const y1 = -4 - (i + 1) * (depth / 8)
    rows.push(
      <polygon
        key={i}
        points={`${x + 4},${y0} ${x + 4 + field},${y0} ${x + 8 + field},${y1} ${x + 8},${y1}`}
        fill={crops[i % 2]}
      />,
    )
  }
  const barn = variant % 2 === 0 ? '#B5483A' : '#A4553D'
  return (
    <g>
      <rect x={x} y={-depth - 6} width={w - 26} height={depth + 6} rx={3} fill="#CBDDB6" />
      <rect x={x} y={-depth - 6} width={field + 12} height={depth + 6} rx={3} fill="#CBB48C" />
      {rows}
      <Cow x={x + field + 22} y={-30} />
      <Cow x={x + field + 34} y={-14} flip />
      <g transform={`translate(${x + w - 18} 0)`}>
        <ellipse cx={3} cy={1.5} rx={20} ry={3.4} fill={COLORS.shadow} />
        <Block x={-14} y={0} w={22} h={18} front={barn} top={shade(barn, 0.25)} />
        <polygon points="-16,-18 -3,-30 10,-18" fill={shade(barn, 0.3)} />
        <polygon points="-13,-18 -3,-27 7,-18" fill={barn} />
        <rect x={-8} y={-11} width={10} height={11} fill="#FFFFFF" />
        <path d="M-8,-11 L2,0 M2,-11 L-8,0" stroke={barn} strokeWidth={1.2} />
        <rect x={11} y={-32} width={9} height={32} rx={1} fill="#D9D4CB" />
        <ellipse cx={15.5} cy={-32} rx={4.5} ry={3} fill="#BFB8AC" />
      </g>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={x + i * 19} y={-6} width={1.4} height={6} fill={COLORS.bark} />
      ))}
      <rect x={x} y={-4.6} width={w - 26} height={1} fill={COLORS.bark} />
      <rect x={x} y={-2.4} width={w - 26} height={1} fill={COLORS.bark} />
    </g>
  )
}

const fazenda: Drawing = {
  width: 150,
  top: () => 42,
  draw: (variant) => <Fazenda variant={variant} />,
}

const PARKED = ['#D9694F', '#3E5C76', '#F4F1EA', '#5E9C7A', '#E3B04B'] as const

function Shopping({ variant }: { variant: number }) {
  const w = 140
  const h = 46
  const x = -w / 2
  const back = -18
  const front = variant % 2 === 0 ? '#F3EDE2' : '#EAF0F2'
  const accent = variant % 2 === 0 ? COLORS.rose : '#3F8A8C'
  return (
    <g>
      <rect x={x - 4} y={back} width={w + 8} height={-back} fill="#D6D1C6" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={x + 2 + i * 12} y={back + 3} width={0.8} height={10} fill="#F7F3EA" />
      ))}
      {[0, 2, 3, 6, 9].map((slot, i) => (
        <Car
          key={slot}
          x={x + 8 + slot * 12}
          y={back + 12}
          variant={i + variant}
          scale={0.8}
          color={PARKED[i]}
        />
      ))}
      <g transform={`translate(0 ${back})`}>
        <Shadow w={w} />
        <Block x={x} y={0} w={w} h={h} front={front} top={COLORS.concrete} />
        <rect x={x - 1} y={-h - 1.5} width={w + 2} height={2} fill={COLORS.parapet} />
        <rect x={x + w / 2 - 34} y={-h - 14} width={68} height={14} rx={3} fill={accent} />
        <text
          x={0}
          y={-h - 4.4}
          textAnchor="middle"
          fontSize={9}
          fontWeight={900}
          fill="#FFFFFF"
          letterSpacing={1.2}
        >
          SHOPPING
        </text>
        <Windows x={x + 6} y={-h + 8} cols={4} w={16} h={12} gapX={3.4} />
        <Windows x={x + w - 6 - 4 * 16 - 3 * 3.4} y={-h + 8} cols={4} w={16} h={12} gapX={3.4} />
        <rect x={x + w / 2 - 16} y={-26} width={32} height={26} fill={COLORS.glassDark} />
        <rect x={x + w / 2 - 16} y={-26} width={11} height={26} fill="#FFFFFF" opacity={0.2} />
        <rect x={x + w / 2 - 19} y={-29} width={38} height={3} fill={accent} />
        <rect x={x + 8} y={-20} width={40} height={2.4} fill={accent} opacity={0.75} />
        <rect x={x + w - 48} y={-20} width={40} height={2.4} fill={accent} opacity={0.75} />
      </g>
    </g>
  )
}

const shopping: Drawing = {
  width: 150,
  top: () => 84,
  draw: (variant) => <Shopping variant={variant} />,
}

export const BUILDINGS: Record<PropertyId, Drawing> = {
  kitnet,
  apartamento,
  casa,
  sala,
  loja,
  galpao,
  predio,
  fazenda,
  shopping,
}

/** Copas de árvore: verde, ipê-amarelo e ipê-roxo. */
const CANOPIES = [
  ['#8DB27F', '#6F9D68'],
  ['#F2CF4C', '#DDB23A'],
  ['#8DB27F', '#6F9D68'],
  ['#D79AC7', '#BC78AB'],
  ['#9DBF84', '#7FA86F'],
] as const

export function Tree({
  x,
  y,
  variant,
  size = 1,
}: {
  x: number
  y: number
  variant: number
  size?: number
}) {
  const [light, dark] = CANOPIES[Math.abs(variant) % CANOPIES.length]
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <ellipse cx={1.5} cy={0.8} rx={7} ry={2.2} fill={COLORS.shadow} />
      <rect x={-1.1} y={-9} width={2.2} height={9} rx={1} fill={COLORS.bark} />
      <circle cx={-3.6} cy={-12} r={5.6} fill={dark} />
      <circle cx={3.4} cy={-12.6} r={5.8} fill={dark} />
      <circle cx={0} cy={-15.5} r={6.8} fill={light} />
      <circle cx={-2.2} cy={-17.6} r={2.2} fill="#FFFFFF" opacity={0.22} />
    </g>
  )
}

/** Arbusto redondo, para canteiros. */
export function Shrub({ x, y, variant }: { x: number; y: number; variant: number }) {
  const [light, dark] = CANOPIES[Math.abs(variant) % CANOPIES.length]
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={-1.6} cy={-1.6} r={2.4} fill={dark} />
      <circle cx={1.6} cy={-1.8} r={2.4} fill={dark} />
      <circle cx={0} cy={-3} r={2.6} fill={light} />
    </g>
  )
}

export function Palm({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={1.5} cy={0.8} rx={6} ry={2} fill={COLORS.shadow} />
      <path
        d="M0,0 C1,-8 -1,-16 2,-24"
        fill="none"
        stroke={COLORS.bark}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {[-60, -20, 20, 60, 160, 200].map((angle) => (
        <path
          key={angle}
          d="M2,-24 q6,-4 12,1"
          fill="none"
          stroke="#6F9D68"
          strokeWidth={2.2}
          strokeLinecap="round"
          transform={`rotate(${angle} 2 -24)`}
        />
      ))}
    </g>
  )
}

const CAR_COLORS = ['#D9694F', '#3E5C76', '#E3B04B', '#5E9C7A', '#C95D79', '#F4F1EA'] as const

export function Car({
  x,
  y,
  variant,
  flip = false,
  scale = 1,
  color,
}: {
  x: number
  y: number
  variant: number
  flip?: boolean
  scale?: number
  color?: string
}) {
  const body = color ?? CAR_COLORS[Math.abs(variant) % CAR_COLORS.length]
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx={0} cy={1.4} rx={10} ry={2} fill={COLORS.shadow} />
      <rect x={-9} y={-6} width={18} height={6} rx={2.4} fill={body} />
      <path d="M-5,-6 L-3,-10 L4,-10 L6.5,-6 Z" fill={body} />
      <path
        d="M-3.8,-6.4 L-2.4,-9.2 L0.2,-9.2 L0.2,-6.4 Z M1.2,-6.4 L1.2,-9.2 L3.6,-9.2 L5.4,-6.4 Z"
        fill="#CFE2F0"
      />
      <circle cx={-5} cy={0} r={1.9} fill="#2F3A33" />
      <circle cx={5} cy={0} r={1.9} fill="#2F3A33" />
      <rect x={7.4} y={-4.6} width={1.6} height={1.2} rx={0.4} fill="#F6E0A4" />
    </g>
  )
}

/** Trator verde, para a estrada de terra. */
export function Tractor({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx={0} cy={1.4} rx={9} ry={2} fill={COLORS.shadow} />
      <rect x={-6} y={-8} width={12} height={5} rx={1} fill="#5E9C7A" />
      <rect x={-6} y={-14} width={6.5} height={6} rx={1} fill="#5E9C7A" />
      <rect x={-5} y={-13} width={4.5} height={3.6} fill="#CFE2F0" />
      <rect x={4} y={-12} width={1.2} height={4} fill="#3B3632" />
      <circle cx={-3.4} cy={-2.6} r={4} fill="#2F3A33" />
      <circle cx={-3.4} cy={-2.6} r={1.6} fill="#E3B04B" />
      <circle cx={5} cy={-1.6} r={2.6} fill="#2F3A33" />
      <circle cx={5} cy={-1.6} r={1} fill="#E3B04B" />
    </g>
  )
}

/** Placa de "vende" fincada na frente de cada lote à venda. */
export function ForSaleSign({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.82)`}>
      <rect x={-0.8} y={-14} width={1.6} height={14} fill={COLORS.bark} />
      <rect
        x={-13}
        y={-24}
        width={26}
        height={11}
        rx={2}
        fill="#FFFFFF"
        stroke={COLORS.rose}
        strokeWidth={1.2}
      />
      <text
        x={0}
        y={-16.2}
        textAnchor="middle"
        fontSize={6.6}
        fontWeight={900}
        fill={COLORS.rose}
        letterSpacing={0.4}
      >
        VENDE
      </text>
    </g>
  )
}

/** Tapume de obra na frente do terreno. */
export function Hoarding({ x, y, width }: { x: number; y: number; width: number }) {
  const boards: ReactNode[] = []
  const n = Math.max(3, Math.round(width / 7))
  for (let i = 0; i < n; i++) {
    boards.push(
      <rect
        key={i}
        x={x - width / 2 + (i * width) / n}
        y={y - 14}
        width={width / n}
        height={14}
        fill={i % 2 === 0 ? COLORS.orange : '#F7F3EA'}
      />,
    )
  }
  return (
    <g>
      <ellipse cx={x} cy={y + 1} rx={width / 2 + 3} ry={2.4} fill={COLORS.shadow} />
      {boards}
      <rect x={x - width / 2} y={y - 15} width={width} height={1.4} fill="#B97C24" />
    </g>
  )
}

/** Terreno de obra: chão de terra com areia, tijolos ou a fundação começando. */
export function Terreno({
  x,
  y,
  width,
  variant,
}: {
  x: number
  y: number
  width: number
  variant: number
}) {
  const left = x - width / 2
  const kind = variant % 3
  return (
    <g>
      <polygon
        points={`${left},${y} ${left + width},${y} ${left + width + 10},${y - 24} ${left + 10},${y - 24}`}
        fill={COLORS.dirt}
      />
      <circle cx={left + 16} cy={y - 8} r={0.9} fill={COLORS.dirtDark} />
      <circle cx={left + width - 10} cy={y - 16} r={0.9} fill={COLORS.dirtDark} />
      <circle cx={left + width / 2} cy={y - 4} r={0.9} fill={COLORS.dirtDark} />
      {kind === 0 ? (
        <path
          d={`M${x - 12},${y - 7} q7,-10 14,0 Z M${x + 1},${y - 9} q5,-7 10,0 Z`}
          fill="#E9D8A6"
          stroke="#D9C38A"
          strokeWidth={0.6}
        />
      ) : kind === 1 ? (
        <g>
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={x - 8 + c * 4 + (r % 2) * 2}
                y={y - 9 - r * 2.2}
                width={3.6}
                height={1.9}
                fill={(r + c) % 2 === 0 ? '#C66B4A' : '#B95F40'}
              />
            )),
          )}
        </g>
      ) : (
        <g>
          <polygon
            points={`${x - 14},${y - 5} ${x + 10},${y - 5} ${x + 15},${y - 15} ${x - 9},${y - 15}`}
            fill="#C9C4B8"
          />
          {[-10, -3, 4, 11].map((rx) => (
            <rect
              key={rx}
              x={x + rx}
              y={y - 20 + (rx + 10) / 4}
              width={0.8}
              height={8}
              fill={COLORS.iron}
            />
          ))}
        </g>
      )}
    </g>
  )
}

/** Nome do tipo na placa da obra. */
const PLURALS: Record<PropertyId, string> = {
  kitnet: 'Kitnets',
  apartamento: 'Apartamentos',
  casa: 'Casas',
  sala: 'Salas comerciais',
  loja: 'Lojas',
  galpao: 'Galpões',
  predio: 'Prédios',
  fazenda: 'Fazendas',
  shopping: 'Shoppings',
}

/** Placa da obra, com o tipo que está sendo construído. */
export function ObraBoard({ x, y, typeId }: { x: number; y: number; typeId: PropertyId }) {
  const name = PLURALS[typeId]
  const w = Math.max(56, name.length * 4 + 14)
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2 + 6} y={-10} width={1.6} height={10} fill={COLORS.bark} />
      <rect x={w / 2 - 7.6} y={-10} width={1.6} height={10} fill={COLORS.bark} />
      <rect
        x={-w / 2}
        y={-30}
        width={w}
        height={21}
        rx={2}
        fill="#FFFFFF"
        stroke="#D9CFBE"
        strokeWidth={0.8}
      />
      <rect x={-w / 2} y={-30} width={w} height={8.5} rx={2} fill={COLORS.orange} />
      <rect x={-w / 2} y={-24} width={w} height={2.5} fill={COLORS.orange} />
      <text
        x={0}
        y={-23.6}
        textAnchor="middle"
        fontSize={6}
        fontWeight={900}
        fill="#FFFFFF"
        letterSpacing={0.6}
      >
        EM OBRAS
      </text>
      <text x={0} y={-13.2} textAnchor="middle" fontSize={6.6} fontWeight={800} fill={COLORS.ink}>
        {name}
      </text>
    </g>
  )
}

/** Guindaste amarelo da obra. */
export function Crane({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#D9A21C" strokeWidth={1.4} fill="none">
      <path d="M-2,0 L-2,-58 L2,-58 L2,0" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M-2,${-i * 11.6} L2,${-i * 11.6 - 11.6}`} strokeWidth={0.9} />
      ))}
      <path d="M-18,-58 L34,-58" strokeWidth={2} />
      <path d="M-2,-58 L0,-66 L2,-58" />
      <path d="M0,-66 L30,-58 M0,-66 L-16,-58" strokeWidth={0.8} />
      <path d="M26,-58 L26,-42" stroke={COLORS.iron} strokeWidth={0.8} />
      <rect x={23} y={-42} width={6} height={4} fill={COLORS.iron} stroke="none" />
      <rect x={-17} y={-61} width={6} height={4} fill="#9AA2A8" stroke="none" />
    </g>
  )
}

/** Alfinete em cima do prédio: coração onde a família mora, moeda onde ela recebe aluguel. */
export function Pin({
  x,
  y,
  kind,
  count,
}: {
  x: number
  y: number
  kind: 'home' | 'rented'
  count?: number
}) {
  const color = kind === 'home' ? COLORS.rose : COLORS.gold
  const badge = count === undefined ? 0 : count >= 100 ? 22 : count >= 10 ? 18 : 14
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M-6.5,-13 a6.5,6.5 0 1 1 13,0 c0,4 -4,6.4 -6.5,10 c-2.5,-3.6 -6.5,-6 -6.5,-10 Z"
        fill={color}
        stroke="#FFFFFF"
        strokeWidth={1.4}
      />
      {kind === 'home' ? (
        <path
          d="M0,-9.6 c-3,-2 -4.4,-3.8 -4.4,-5.4 c0,-1.6 1.2,-2.6 2.4,-2.6 c0.9,0 1.6,0.5 2,1.2 c0.4,-0.7 1.1,-1.2 2,-1.2 c1.2,0 2.4,1 2.4,2.6 c0,1.6 -1.4,3.4 -4.4,5.4 Z"
          fill="#FFFFFF"
        />
      ) : (
        <text x={0} y={-10.6} textAnchor="middle" fontSize={6.4} fontWeight={900} fill="#FFFFFF">
          R$
        </text>
      )}
      {badge > 0 ? (
        <g transform="translate(6 -20)">
          <rect
            x={0}
            y={-6}
            width={badge}
            height={11}
            rx={5.5}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth={1}
          />
          <text
            x={badge / 2}
            y={2.2}
            textAnchor="middle"
            fontSize={7}
            fontWeight={900}
            fill={COLORS.ink}
          >
            {`×${count}`}
          </text>
        </g>
      ) : null}
    </g>
  )
}
