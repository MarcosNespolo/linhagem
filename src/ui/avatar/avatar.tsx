import { memo, useId } from 'react'
import type { AvatarLook, HairCut, Stage } from './look'
import { lookKey } from './look'
import { BLUSH, MOUTH, mixColor, shade } from './palette'

type Head = { cx: number; cy: number; rx: number; ry: number }

const HEADS: Record<Stage, Head> = {
  baby: { cx: 50, cy: 56, rx: 24, ry: 22.5 },
  child: { cx: 50, cy: 52, rx: 22, ry: 22.5 },
  teen: { cx: 50, cy: 48.5, rx: 20.5, ry: 23 },
  adult: { cx: 50, cy: 47.5, rx: 20.5, ry: 23.5 },
  elder: { cx: 50, cy: 47.5, rx: 20.5, ry: 23.5 },
}

const EYES: Record<Stage, { dy: number; dx: number; rx: number; ry: number }> = {
  baby: { dy: 2.5, dx: 9.5, rx: 3.1, ry: 3.7 },
  child: { dy: 2, dx: 8.6, rx: 2.8, ry: 3.3 },
  teen: { dy: 1.5, dx: 8, rx: 2.5, ry: 3.1 },
  adult: { dy: 1.5, dx: 8, rx: 2.4, ry: 3 },
  elder: { dy: 1.5, dx: 8, rx: 2.3, ry: 2.6 },
}

const BODIES: Record<
  Stage,
  { shoulders: string; top: number; neck: [number, number, number, number] | null }
> = {
  baby: { shoulders: 'M23 104 C23 93 35 86 50 86 C65 86 77 93 77 104 Z', top: 86, neck: null },
  child: {
    shoulders: 'M19 104 C19 89 33 80.5 50 80.5 C67 80.5 81 89 81 104 Z',
    top: 80.5,
    neck: [45, 66, 10, 17],
  },
  teen: {
    shoulders: 'M14 104 C14 85 30 77 50 77 C70 77 86 85 86 104 Z',
    top: 77,
    neck: [44, 62, 12, 18],
  },
  adult: {
    shoulders: 'M10 104 C10 84 28 75.5 50 75.5 C72 75.5 90 84 90 104 Z',
    top: 75.5,
    neck: [43.5, 60, 13, 19],
  },
  elder: {
    shoulders: 'M11 104 C11 85 28 76 50 76 C72 76 89 85 89 104 Z',
    top: 76,
    neck: [43.5, 60, 13, 19],
  },
}

/**
 * Contorno de cabelo que cobre o topo da cabeça: um arco de uma têmpora à
 * outra e, de volta, a linha do cabelo descrita em `hairline` (da direita para
 * a esquerda). `puff` é o volume acima da cabeça.
 */
function cap(h: Head, hairline: string, puff = 2, sideY = h.cy - 2): string {
  const left = h.cx - h.rx - 1.4
  const right = h.cx + h.rx + 1.4
  return `M${left} ${sideY} A${h.rx + 1.4} ${h.ry + puff} 0 0 1 ${right} ${sideY} ${hairline} Z`
}

function hairlineShort(h: Head): string {
  const { cx, cy, rx, ry } = h
  const right = cx + rx + 1.4
  const left = cx - rx - 1.4
  const hy = cy - ry * 0.5
  return [
    `L${right - 2.6} ${cy - 2}`,
    `Q${right - 3} ${hy} ${cx + 6} ${hy - 0.6}`,
    `Q${cx} ${hy - 1.6} ${cx - 5} ${hy + 1.8}`,
    `Q${left + 3} ${hy + 1} ${left + 2.6} ${cy - 2}`,
  ].join(' ')
}

function hairlineSidePart(h: Head): string {
  const { cx, cy, rx, ry } = h
  const right = cx + rx + 1.4
  const left = cx - rx - 1.4
  return [
    `L${right - 2.4} ${cy - 2}`,
    `Q${right - 2} ${cy - ry * 0.7} ${cx + 5} ${cy - ry * 0.78}`,
    `Q${cx - 6} ${cy - ry * 0.62} ${cx - rx * 0.62} ${cy - ry * 0.26}`,
    `Q${left + 1.5} ${cy - ry * 0.16} ${left + 2.4} ${cy - 2}`,
  ].join(' ')
}

function hairlineSmooth(h: Head, height: number): string {
  const { cx, cy, rx, ry } = h
  const right = cx + rx + 1.4
  const left = cx - rx - 1.4
  const hy = cy - ry * height
  return [
    `L${right - 2.4} ${cy - 1}`,
    `Q${right - 3} ${hy} ${cx} ${hy}`,
    `Q${left + 3} ${hy} ${left + 2.4} ${cy - 1}`,
  ].join(' ')
}

/** Cabelo que desce emoldurando o rosto, repartido no meio. */
function curtains(h: Head, bottom: number, puff = 2.6): string {
  const { cx, cy, rx, ry } = h
  const left = cx - rx - 1.8
  const right = cx + rx + 1.8
  return [
    `M${left} ${bottom}`,
    `L${left} ${cy - 2}`,
    `A${rx + 1.8} ${ry + puff} 0 0 1 ${right} ${cy - 2}`,
    `L${right} ${bottom}`,
    `Q${right - 3.2} ${cy - ry * 0.25} ${cx + 1} ${cy - ry * 0.7}`,
    `Q${left + 3.2} ${cy - ry * 0.25} ${left} ${bottom}`,
    'Z',
  ].join(' ')
}

function ring(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  count: number,
) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (from + ((to - from) * i) / (count - 1)) * Math.PI
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
  })
}

function HairBack({ cut, h, color }: { cut: HairCut; h: Head; color: string }) {
  return (
    <g stroke={shade(color, 0.35)} strokeWidth={0.8} strokeLinejoin="round">
      <HairBackShape cut={cut} h={h} color={color} />
    </g>
  )
}

/** Brilho no topo do cabelo, que separa o cabelo escuro de uma pele escura. */
function Sheen({ h, color }: { h: Head; color: string }) {
  const { cx, cy, rx, ry } = h
  return (
    <path
      d={`M${cx - rx * 0.62} ${cy - ry * 0.7} Q${cx - rx * 0.32} ${cy - ry - 1.1} ${cx + rx * 0.12} ${cy - ry - 1.3}`}
      stroke={mixColor(color, '#ffffff', 0.42)}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
      opacity={0.55}
    />
  )
}

function hasSheen(look: AvatarLook): boolean {
  if (look.balding === 2 || look.cut === 'tuft') return false
  return !['curlyShort', 'curlyLong', 'afro'].includes(look.cut)
}

function HairBackShape({ cut, h, color }: { cut: HairCut; h: Head; color: string }) {
  const { cx, cy, rx, ry } = h
  const L = cx - rx
  const R = cx + rx
  switch (cut) {
    case 'long':
      return (
        <path
          fill={color}
          d={[
            `M${L - 3.5} ${cy - 6}`,
            `C${L - 4.5} ${cy + 10} ${L - 4} ${cy + ry + 6} ${L - 1} ${cy + ry + 14}`,
            `Q${cx} ${cy + ry + 17} ${R + 1} ${cy + ry + 14}`,
            `C${R + 4} ${cy + ry + 6} ${R + 4.5} ${cy + 10} ${R + 3.5} ${cy - 6}`,
            `A${rx + 3.5} ${ry + 3} 0 0 0 ${L - 3.5} ${cy - 6}`,
            'Z',
          ].join(' ')}
        />
      )
    case 'bob':
      return (
        <path
          fill={color}
          d={[
            `M${L - 3} ${cy - 6}`,
            `L${L - 3.4} ${cy + ry * 0.55}`,
            `Q${L - 2.6} ${cy + ry * 0.88} ${L + 3} ${cy + ry * 0.84}`,
            `L${R - 3} ${cy + ry * 0.84}`,
            `Q${R + 2.6} ${cy + ry * 0.88} ${R + 3.4} ${cy + ry * 0.55}`,
            `L${R + 3} ${cy - 6}`,
            `A${rx + 3} ${ry + 3} 0 0 0 ${L - 3} ${cy - 6}`,
            'Z',
          ].join(' ')}
        />
      )
    case 'bun':
      return (
        <g fill={color}>
          <circle cx={cx} cy={cy - ry - 4.5} r={8.5} />
        </g>
      )
    case 'ponytail':
      return (
        <path
          fill={color}
          d={[
            `M${R - 2} ${cy - ry * 0.6}`,
            `C${R + 11} ${cy - ry * 0.45} ${R + 10} ${cy + ry * 0.6} ${R + 4} ${cy + ry + 7}`,
            `C${R + 2.5} ${cy + ry * 0.45} ${R + 1} ${cy} ${R - 2} ${cy - ry * 0.15}`,
            'Z',
          ].join(' ')}
        />
      )
    case 'pigtails':
      return (
        <g fill={color}>
          <ellipse
            cx={L - 3.5}
            cy={cy + 5}
            rx={4.8}
            ry={8.6}
            transform={`rotate(14 ${L - 3.5} ${cy + 5})`}
          />
          <ellipse
            cx={R + 3.5}
            cy={cy + 5}
            rx={4.8}
            ry={8.6}
            transform={`rotate(-14 ${R + 3.5} ${cy + 5})`}
          />
        </g>
      )
    case 'curlyLong': {
      const puffs = ring(cx, cy + 3, rx + 6, ry + 7, 0.62, 2.38, 13)
      return (
        <g fill={color}>
          <ellipse cx={cx} cy={cy + 3} rx={rx + 5} ry={ry + 6} />
          {puffs.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={7.2} />
          ))}
        </g>
      )
    }
    case 'afro': {
      const puffs = ring(cx, cy - 5, rx + 8, ry + 6, 0.82, 2.18, 11)
      return (
        <g fill={color}>
          <ellipse cx={cx} cy={cy - 5} rx={rx + 7} ry={ry + 5} />
          {puffs.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={7} />
          ))}
        </g>
      )
    }
    default:
      return null
  }
}

function HairFront({ look, h }: { look: AvatarLook; h: Head }) {
  const { cut, hair, balding } = look
  const { cx, cy, rx, ry } = h
  const L = cx - rx
  const R = cx + rx
  const top = cy - ry

  if (cut === 'tuft') {
    return (
      <g fill="none" stroke={hair} strokeLinecap="round">
        <path
          d={`M${cx - 1} ${top + 2.5} C${cx - 3.5} ${top - 4} ${cx + 5} ${top - 6.5} ${cx + 4.5} ${top - 1}`}
          strokeWidth={2.6}
        />
        <path d={`M${cx + 3} ${top + 2} q2.2 -4.2 5.4 -3`} strokeWidth={1.9} />
      </g>
    )
  }

  if (balding === 2) {
    return (
      <g fill={hair}>
        <path
          d={`M${L - 1.4} ${cy + 1} Q${L - 2} ${cy - 9} ${L + 4.5} ${cy - ry * 0.52} Q${L + 2.6} ${cy - 6} ${L + 3.4} ${cy + 1} Z`}
        />
        <path
          d={`M${R + 1.4} ${cy + 1} Q${R + 2} ${cy - 9} ${R - 4.5} ${cy - ry * 0.52} Q${R - 2.6} ${cy - 6} ${R - 3.4} ${cy + 1} Z`}
        />
      </g>
    )
  }
  if (balding === 1) {
    return <path fill={hair} opacity={0.82} d={cap(h, hairlineSmooth(h, 0.74), 0.8)} />
  }

  switch (cut) {
    case 'short':
      return <path fill={hair} d={cap(h, hairlineShort(h), 2.2)} />
    case 'sidePart':
      return <path fill={hair} d={cap(h, hairlineSidePart(h), 2.6)} />
    case 'buzz':
      return <path fill={hair} opacity={0.92} d={cap(h, hairlineSmooth(h, 0.56), 0.6)} />
    case 'curlyShort': {
      const puffs = ring(cx, cy - 2, rx + 0.5, ry + 1.5, 1.04, 1.96, 9)
      return (
        <g fill={hair}>
          <path d={cap(h, hairlineSmooth(h, 0.5), 2)} />
          {puffs.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={look.stage === 'child' ? 5 : 5.4} />
          ))}
        </g>
      )
    }
    case 'afro':
      return <path fill={hair} d={cap(h, hairlineSmooth(h, 0.5), 3)} />
    case 'long':
      return <path fill={hair} d={curtains(h, cy + 7)} />
    case 'bob':
      return (
        <path
          fill={hair}
          d={[
            `M${L - 1.8} ${cy + ry * 0.5}`,
            `L${L - 1.8} ${cy - 2}`,
            `A${rx + 1.8} ${ry + 2.6} 0 0 1 ${R + 1.8} ${cy - 2}`,
            `L${R + 1.8} ${cy + ry * 0.5}`,
            `Q${R - 1} ${cy + ry * 0.08} ${R - 2.6} ${cy - ry * 0.3}`,
            `Q${cx} ${cy - ry * 0.2} ${L + 2.6} ${cy - ry * 0.3}`,
            `Q${L + 1} ${cy + ry * 0.08} ${L - 1.8} ${cy + ry * 0.5}`,
            'Z',
          ].join(' ')}
        />
      )
    case 'bun':
    case 'ponytail':
      return (
        <g>
          <path fill={hair} d={cap(h, hairlineSmooth(h, 0.6), 1.2)} />
          {cut === 'ponytail' ? (
            <circle cx={R - 0.8} cy={cy - ry * 0.48} r={2.2} fill={look.shirt} />
          ) : null}
        </g>
      )
    case 'pigtails':
      return (
        <g>
          <path fill={hair} d={curtains(h, cy + 1, 2.2)} />
          <circle cx={L - 1} cy={cy - 3} r={2.4} fill={look.shirt} />
          <circle cx={R + 1} cy={cy - 3} r={2.4} fill={look.shirt} />
        </g>
      )
    case 'curlyLong': {
      const puffs = ring(cx, cy - 1, rx - 1, ry, 1.14, 1.86, 7)
      return (
        <g fill={hair}>
          <path d={curtains(h, cy + 6, 3)} />
          {puffs.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4.6} />
          ))}
        </g>
      )
    }
  }
}

function Face({ look, h }: { look: AvatarLook; h: Head }) {
  const { stage } = look
  const { cx, cy, ry } = h
  const eye = EYES[stage]
  const ey = cy + eye.dy
  const lx = cx - eye.dx
  const rxEye = cx + eye.dx
  const young = stage === 'baby' || stage === 'child'
  const browWidth = stage === 'baby' ? 0 : stage === 'child' ? 1.3 : 1.7
  const line = look.skinShade

  return (
    <g>
      {look.wrinkles === 2 ? (
        <path
          d={`M${cx - 6.5} ${cy - ry * 0.42} Q${cx} ${cy - ry * 0.48} ${cx + 6.5} ${cy - ry * 0.42}`}
          stroke={line}
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
      ) : null}

      <g fill={BLUSH} opacity={look.blush}>
        <ellipse cx={cx - 11.5} cy={ey + 6.8} rx={3.5} ry={2.3} />
        <ellipse cx={cx + 11.5} cy={ey + 6.8} rx={3.5} ry={2.3} />
      </g>

      {look.freckles ? (
        <g fill={shade(look.skin, 0.32)} opacity={0.75}>
          {[-1, 1].map((side) => (
            <g key={side}>
              <circle cx={cx + side * 9} cy={ey + 4.6} r={0.7} />
              <circle cx={cx + side * 11.6} cy={ey + 5.2} r={0.7} />
              <circle cx={cx + side * 10.2} cy={ey + 6.8} r={0.7} />
            </g>
          ))}
        </g>
      ) : null}

      {[lx, rxEye].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={ey} rx={eye.rx} ry={eye.ry} fill={look.eyes} />
          <ellipse
            cx={x}
            cy={ey + 0.3}
            rx={eye.rx * 0.55}
            ry={eye.ry * 0.55}
            fill="#120c09"
            opacity={0.55}
          />
          <circle
            cx={x + eye.rx * 0.35}
            cy={ey - eye.ry * 0.38}
            r={young ? 1.1 : 0.85}
            fill="#fff"
          />
        </g>
      ))}

      {look.wrinkles >= 1 ? (
        <g stroke={line} strokeWidth={0.9} fill="none" strokeLinecap="round">
          <path
            d={`M${lx - eye.rx - 1.6} ${ey - 0.6} l-2 -1.2 M${lx - eye.rx - 1.6} ${ey + 1} l-2 1.1`}
          />
          <path
            d={`M${rxEye + eye.rx + 1.6} ${ey - 0.6} l2 -1.2 M${rxEye + eye.rx + 1.6} ${ey + 1} l2 1.1`}
          />
        </g>
      ) : null}

      {browWidth > 0 ? (
        <g stroke={look.brow} strokeWidth={browWidth} fill="none" strokeLinecap="round">
          <path d={`M${lx - 3.8} ${ey - 5.8} Q${lx} ${ey - 8.2} ${lx + 3.6} ${ey - 6.3}`} />
          <path
            d={`M${rxEye + 3.8} ${ey - 5.8} Q${rxEye} ${ey - 8.2} ${rxEye - 3.6} ${ey - 6.3}`}
          />
        </g>
      ) : null}

      {stage === 'baby' ? null : young ? (
        <path
          d={`M${cx - 1} ${ey + 6} q1 1.2 2 0`}
          stroke={line}
          strokeWidth={1.3}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M${cx} ${ey + 3} Q${cx + 2.2} ${ey + 6.6} ${cx - 0.6} ${ey + 7.4}`}
          stroke={line}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {look.beard ? <Beard look={look} h={h} ey={ey} /> : null}

      {young ? (
        <path
          d={`M${cx - 5.6} ${ey + 9.6} Q${cx} ${ey + 16.6} ${cx + 5.6} ${ey + 9.6} Q${cx} ${ey + 12} ${cx - 5.6} ${ey + 9.6} Z`}
          fill={MOUTH}
        />
      ) : (
        <path
          d={`M${cx - 5.4} ${ey + 10.6} Q${cx} ${ey + 14.6} ${cx + 5.4} ${ey + 10.6}`}
          stroke={look.beard ? shade(MOUTH, 0.1) : MOUTH}
          strokeWidth={1.7}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

function Beard({ look, h, ey }: { look: AvatarLook; h: Head; ey: number }) {
  const { cx, cy, rx, ry } = h
  const clipId = useId()
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={cx} cy={cy} rx={rx + 0.6} ry={ry + 0.8} />
        </clipPath>
      </defs>
      <path
        clipPath={`url(#${clipId})`}
        fill={look.hair}
        d={`M${cx - rx - 2} ${ey + 3} Q${cx} ${ey + 9.5} ${cx + rx + 2} ${ey + 3} L${cx + rx + 2} ${cy + ry + 3} L${cx - rx - 2} ${cy + ry + 3} Z`}
      />
      <ellipse cx={cx} cy={ey + 11.6} rx={5} ry={2.7} fill={look.skin} />
      <path
        fill={look.hair}
        d={`M${cx - 6} ${ey + 9.8} Q${cx} ${ey + 6.6} ${cx + 6} ${ey + 9.8} Q${cx} ${ey + 8.6} ${cx - 6} ${ey + 9.8} Z`}
      />
    </g>
  )
}

function Glasses({ color, h, stage }: { color: string; h: Head; stage: Stage }) {
  const eye = EYES[stage]
  const ey = h.cy + eye.dy
  const lx = h.cx - eye.dx
  const rx = h.cx + eye.dx
  const r = stage === 'child' ? 4.6 : 4.4
  return (
    <g stroke={color} strokeWidth={1.4} fill="#ffffff" fillOpacity={0.16}>
      <circle cx={lx} cy={ey} r={r} />
      <circle cx={rx} cy={ey} r={r} />
      <path d={`M${lx + r} ${ey - 0.4} Q${h.cx} ${ey - 2.2} ${rx - r} ${ey - 0.4}`} fill="none" />
    </g>
  )
}

type AvatarProps = {
  look: AvatarLook
  size: number
  className?: string
  /** Texto para leitores de tela. Sem título, o desenho é decorativo. */
  title?: string
}

function AvatarDrawing({ look, size, className, title }: AvatarProps) {
  const clipId = useId()
  const h = HEADS[look.stage]
  const body = BODIES[look.stage]
  const neck = body.neck
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={50} cy={50} r={50} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width={100} height={100} fill={look.background} />
        <path d={body.shoulders} fill={look.shirt} />
        <path
          d={`M44 ${body.top + 0.4} Q50 ${body.top + 7.5} 56 ${body.top + 0.4} Z`}
          fill={look.skinShade}
        />
        <HairBack cut={look.balding === 2 ? 'short' : look.cut} h={h} color={look.hair} />
        {neck ? (
          <rect
            x={neck[0]}
            y={neck[1]}
            width={neck[2]}
            height={neck[3]}
            rx={5}
            fill={look.skinShade}
          />
        ) : null}
        <g fill={look.skin} stroke={look.skinShade} strokeWidth={0.7}>
          <circle cx={h.cx - h.rx + 0.4} cy={h.cy + EYES[look.stage].dy + 1.5} r={4.3} />
          <circle cx={h.cx + h.rx - 0.4} cy={h.cy + EYES[look.stage].dy + 1.5} r={4.3} />
          <ellipse cx={h.cx} cy={h.cy} rx={h.rx} ry={h.ry} />
        </g>
        <Face look={look} h={h} />
        <g stroke={shade(look.hair, 0.35)} strokeWidth={0.8} strokeLinejoin="round">
          <HairFront look={look} h={h} />
        </g>
        {hasSheen(look) ? <Sheen h={h} color={look.hair} /> : null}
        {look.glasses ? <Glasses color={look.glasses} h={h} stage={look.stage} /> : null}
      </g>
    </svg>
  )
}

/** Avatar procedural. Só redesenha quando a aparência visível muda. */
export const Avatar = memo(
  AvatarDrawing,
  (prev, next) =>
    prev.size === next.size &&
    prev.className === next.className &&
    prev.title === next.title &&
    lookKey(prev.look) === lookKey(next.look),
)
