'use client'

import { Baby, Heart, LocateFixed, Minus, Plus } from 'lucide-react'
import { memo } from 'react'
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'
import {
  ageOf,
  halfTimeCaregivers,
  incomeOf,
  memberExpense,
  type GameState,
  type MemberId,
} from '@/engine'
import { formatSignedMoney } from '@/lib/format'
import { Avatar } from '../avatar/avatar'
import { avatarLook, lookKey, type AvatarLook } from '../avatar/look'
import type { NodeAction } from '../selectors'
import {
  buildFamilyTree,
  layoutFamilyTree,
  TREE_METRICS,
  type Branch,
  type PlacedPerson,
  type TreeLayout,
} from './layout'

const { slot: SLOT, avatar: AVATAR } = TREE_METRICS
const MIN_FOCUS_SCALE = 0.45
const MAX_FOCUS_SCALE = 1.05

type Viewport = Pick<ReactZoomPanPinchRef, 'instance' | 'setTransform'>

/**
 * Enquadra quem está vivo: numa família pequena mostra a árvore inteira; numa
 * grande, que não cabe na tela nem com o zoom mínimo, o trecho com mais gente
 * viva, para os ramos de quem saiu de casa não tomarem a tela.
 */
function focusLiving(view: Viewport, layout: TreeLayout, game: GameState, animationTime: number) {
  const wrapper = view.instance.wrapperComponent
  if (!wrapper) return
  const living = layout.people.filter((person) => game.members[person.id]?.deathDay === null)
  const targets = living.length > 0 ? living : layout.people
  const width = wrapper.clientWidth
  const height = wrapper.clientHeight
  const all = bounds(targets)
  const fit = Math.min(width / (all.maxX - all.minX), height / (all.maxY - all.minY))
  const scale = Math.min(Math.max(fit, MIN_FOCUS_SCALE), MAX_FOCUS_SCALE)
  const box = fit < MIN_FOCUS_SCALE ? bounds(densest(targets, width / scale - SLOT - 32)) : all
  const centerX = (box.minX + box.maxX) / 2
  const centerY = (box.minY + box.maxY) / 2
  view.setTransform(width / 2 - centerX * scale, height / 2 - centerY * scale, scale, animationTime)
}

/** Retângulo em volta dos avatares, com espaço para o nome e a renda embaixo. */
function bounds(people: readonly PlacedPerson[]) {
  const xs = people.map((person) => person.x)
  const ys = people.map((person) => person.y)
  return {
    minX: Math.min(...xs) - SLOT / 2 - 16,
    maxX: Math.max(...xs) + SLOT / 2 + 16,
    minY: Math.min(...ys) - AVATAR / 2 - 24,
    maxY: Math.max(...ys) + AVATAR / 2 + 56,
  }
}

/** As pessoas da faixa horizontal de largura `span` com mais gente. */
function densest(people: readonly PlacedPerson[], span: number): PlacedPerson[] {
  const sorted = [...people].sort((a, b) => a.x - b.x)
  let best = { start: 0, end: 1 }
  let end = 0
  for (let start = 0; start < sorted.length; start++) {
    while (end < sorted.length && sorted[end].x - sorted[start].x <= span) end += 1
    if (end - start > best.end - best.start) best = { start, end }
  }
  return sorted.slice(best.start, best.end)
}

let cached: { key: string; layout: TreeLayout | null } | null = null

/**
 * O layout só muda quando alguém nasce, casa, sai de casa ou morre. Guardamos
 * o último para não recalcular a cada segundo.
 */
function treeLayoutFor(game: GameState, showDeceased: boolean): TreeLayout | null {
  const parts = [showDeceased ? 'all' : 'living']
  for (const member of Object.values(game.members)) {
    const state = member.deathDay === null ? '' : 'x'
    parts.push(`${member.id}:${member.partnerId ?? ''}:${state}`)
  }
  const key = parts.join('|')
  if (cached?.key !== key) {
    const root = buildFamilyTree(game, { showDeceased })
    cached = { key, layout: root ? layoutFamilyTree(root) : null }
  }
  return cached.layout
}

type Props = {
  game: GameState
  showDeceased: boolean
  actions: Map<MemberId, NodeAction>
  selectedId: MemberId | null
  onSelect: (id: MemberId) => void
}

export function FamilyTree({ game, showDeceased, actions, selectedId, onSelect }: Props) {
  const layout = treeLayoutFor(game, showDeceased)
  if (!layout) return null
  const day = game.clock.day
  const caregivers = halfTimeCaregivers(game)

  return (
    <TransformWrapper
      key={showDeceased ? 'all' : 'living'}
      minScale={0.25}
      maxScale={2.2}
      limitToBounds={false}
      doubleClick={{ disabled: true }}
      wheel={{ step: 0.08 }}
      onInit={(ref: ReactZoomPanPinchRef) => focusLiving(ref, layout, game, 0)}
    >
      <TransformComponent
        wrapperStyle={{ width: '100%', height: '100%' }}
        contentStyle={{ width: layout.width, height: layout.height }}
      >
        <div className="relative" style={{ width: layout.width, height: layout.height }}>
          <Branches layout={layout} game={game} />
          {layout.couples.map((couple) => {
            const action = actions.get(couple.aId) ?? actions.get(couple.bId)
            const together =
              game.members[couple.aId].deathDay === null &&
              game.members[couple.bId].deathDay === null
            return (
              <Knot
                key={`${couple.aId}-${couple.bId}`}
                id={couple.aId}
                x={(couple.x1 + couple.x2) / 2}
                y={couple.y}
                canHaveChild={action === 'child'}
                together={together}
                onSelect={onSelect}
              />
            )
          })}
          {layout.people.map((person) => {
            const member = game.members[person.id]
            const age = ageOf(member, day)
            const rate = incomeOf(game, member, caregivers) - memberExpense(member, day)
            return (
              <TreeNode
                key={person.id}
                id={person.id}
                x={person.x}
                y={person.y}
                name={member.firstName}
                age={age}
                rate={rate}
                alive={member.deathDay === null}
                look={avatarLook(member.appearance, member.gender, age, member.avatarSeed)}
                dating={actions.get(person.id) === 'dating'}
                selected={selectedId === person.id}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      </TransformComponent>
      <TreeControls onFocus={(view) => focusLiving(view, layout, game, 250)} />
    </TransformWrapper>
  )
}

/** Ponto e tangente de uma curva de Bézier cúbica, para posicionar as folhas. */
function bezierAt(b: Branch, t: number) {
  const dy = b.toY - b.fromY
  const p = [
    { x: b.fromX, y: b.fromY },
    { x: b.fromX, y: b.fromY + dy * 0.55 },
    { x: b.toX, y: b.toY - dy * 0.55 },
    { x: b.toX, y: b.toY },
  ]
  const u = 1 - t
  const x = u ** 3 * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t ** 3 * p[3].x
  const y = u ** 3 * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t ** 3 * p[3].y
  const dx =
    3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x)
  const dyt =
    3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y)
  return { x, y, angle: (Math.atan2(dyt, dx) * 180) / Math.PI }
}

function branchPath(b: Branch): string {
  const dy = b.toY - b.fromY
  return `M${b.fromX} ${b.fromY} C${b.fromX} ${b.fromY + dy * 0.55} ${b.toX} ${b.toY - dy * 0.55} ${b.toX} ${b.toY}`
}

const LEAF = 'M0 0 Q5 -4.2 11 0 Q5 4.2 0 0 Z'

/** Galhos entre casais e filhos. Quem está vivo tem folhas; galho de quem morreu fica seco. */
function Branches({ layout, game }: { layout: TreeLayout; game: GameState }) {
  return (
    <svg
      width={layout.width}
      height={layout.height}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {layout.couples.map((couple) => (
        <line
          key={`${couple.aId}-${couple.bId}`}
          x1={couple.x1 + AVATAR / 2 - 2}
          x2={couple.x2 - AVATAR / 2 + 2}
          y1={couple.y}
          y2={couple.y}
          stroke="var(--color-bark)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      {layout.branches.map((branch, index) => {
        const child = game.members[branch.childId]
        const alive = child !== undefined && child.deathDay === null
        const width = Math.max(2.4, 5.6 - branch.depth * 0.9)
        const side = index % 2 === 0 ? 1 : -1
        const leaf = bezierAt(branch, 0.42)
        const second = bezierAt(branch, 0.7)
        return (
          <g key={branch.childId}>
            <path
              d={branchPath(branch)}
              fill="none"
              stroke={alive ? 'var(--color-bark)' : 'var(--color-bark-soft)'}
              strokeWidth={width}
              strokeLinecap="round"
            />
            {alive ? (
              <g fill="#6f9d68">
                <path
                  d={LEAF}
                  transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle - 50 * side})`}
                />
                <path
                  d={LEAF}
                  fill="#8db27f"
                  transform={`translate(${second.x} ${second.y}) rotate(${second.angle + 50 * side}) scale(0.8)`}
                />
              </g>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

type KnotProps = {
  id: MemberId
  x: number
  y: number
  canHaveChild: boolean
  together: boolean
  onSelect: (id: MemberId) => void
}

/** Nó entre o casal. Fica verde com um bebê quando o casal pode ter um filho. */
const Knot = memo(function Knot({ id, x, y, canHaveChild, together, onSelect }: KnotProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-label={canHaveChild ? 'Este casal pode ter um filho' : 'Ver o casal'}
      className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-2 ring-white transition active:scale-90 ${
        canHaveChild
          ? 'bg-leaf text-white'
          : together
            ? 'bg-rose-soft text-rose'
            : 'bg-line text-ink-soft'
      }`}
      style={{ left: x, top: y }}
    >
      {canHaveChild ? (
        <Baby size={15} strokeWidth={2.4} />
      ) : (
        <Heart size={13} fill="currentColor" />
      )}
    </button>
  )
})

type NodeProps = {
  id: MemberId
  x: number
  y: number
  name: string
  age: number
  rate: number
  alive: boolean
  look: AvatarLook
  /** Namora: um coração no canto da foto. */
  dating: boolean
  selected: boolean
  onSelect: (id: MemberId) => void
}

const TreeNode = memo(
  function TreeNode({
    id,
    x,
    y,
    name,
    age,
    rate,
    alive,
    look,
    dating,
    selected,
    onSelect,
  }: NodeProps) {
    return (
      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-label={`${name}, ${age === 0 ? 'menos de 1 ano' : age === 1 ? '1 ano' : `${age} anos`}${alive ? '' : ', faleceu'}`}
        className="group absolute flex flex-col items-center outline-none"
        style={{ left: x - SLOT / 2, top: y - AVATAR / 2, width: SLOT }}
      >
        <span className="relative">
          <Avatar
            look={look}
            size={AVATAR}
            className={`group-focus-visible:ring-leaf rounded-full ring-[3px] transition ${
              selected ? 'ring-leaf' : 'ring-white'
            } ${alive ? '' : 'opacity-60 grayscale'}`}
          />
          <span
            className={`tabular absolute -top-1 -left-1.5 grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] font-extrabold ring-2 ring-white ${
              alive ? 'bg-ink text-white' : 'bg-line text-ink-soft'
            }`}
          >
            {age}
          </span>
          {dating ? (
            <span className="bg-rose absolute -top-1 -right-1.5 grid size-6 place-items-center rounded-full text-white ring-2 ring-white">
              <Heart size={12} fill="currentColor" />
            </span>
          ) : null}
        </span>
        <span className="bg-surface/90 text-ink mt-1.5 max-w-full truncate rounded-full px-2 text-[13px] leading-5 font-bold">
          {name}
        </span>
        {alive && rate !== 0 ? (
          <span
            className={`tabular bg-surface/90 rounded-full px-1.5 text-[11.5px] leading-4 font-bold ${
              rate < 0 ? 'text-expense' : 'text-income'
            }`}
          >
            {formatSignedMoney(rate)}
          </span>
        ) : null}
      </button>
    )
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.name === next.name &&
    prev.age === next.age &&
    prev.rate === next.rate &&
    prev.alive === next.alive &&
    prev.dating === next.dating &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect &&
    lookKey(prev.look) === lookKey(next.look),
)

function TreeControls({ onFocus }: { onFocus: (view: Viewport) => void }) {
  const controls = useControls()
  const button =
    'grid size-10 place-items-center rounded-full bg-surface text-ink shadow-[0_1px_0_var(--color-line)] ring-1 ring-line transition active:scale-95'
  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2">
      <button
        type="button"
        className={button}
        onClick={() => controls.zoomIn(0.3)}
        aria-label="Aproximar"
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => controls.zoomOut(0.3)}
        aria-label="Afastar"
      >
        <Minus size={18} />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => onFocus(controls)}
        aria-label="Centralizar em quem está vivo"
      >
        <LocateFixed size={18} />
      </button>
    </div>
  )
}
