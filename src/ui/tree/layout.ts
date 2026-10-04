import type { GameState, MemberId } from '@/engine'

/**
 * Unidade da árvore: um membro de sangue (ou o primeiro fundador) e, se
 * houver, o cônjuge, desenhados lado a lado. Os filhos ficam embaixo.
 */
export type TreeUnit = {
  coreId: MemberId
  memberIds: MemberId[]
  children: TreeUnit[]
}

export type TreeMetrics = {
  /** Largura reservada para cada pessoa, com nome e renda embaixo. */
  slot: number
  /** Espaço entre as duas pessoas de um casal. */
  coupleGap: number
  /** Espaço mínimo entre subárvores vizinhas. */
  siblingGap: number
  /** Distância vertical entre gerações. */
  rowHeight: number
  /** Diâmetro do avatar. */
  avatar: number
  /** Margem em volta da árvore. */
  padding: number
}

export const TREE_METRICS: TreeMetrics = {
  slot: 88,
  coupleGap: 16,
  siblingGap: 20,
  rowHeight: 176,
  avatar: 64,
  padding: 48,
}

export type PlacedPerson = { id: MemberId; x: number; y: number }
export type CoupleLink = { aId: MemberId; bId: MemberId; x1: number; x2: number; y: number }
export type Branch = {
  fromX: number
  fromY: number
  toX: number
  toY: number
  depth: number
  childId: MemberId
}

export type TreeLayout = {
  width: number
  height: number
  /** Centro do avatar de cada pessoa visível. */
  people: PlacedPerson[]
  couples: CoupleLink[]
  /** Galhos do meio do casal até o avatar de cada filho. */
  branches: Branch[]
}

/**
 * Monta a árvore a partir do estado. Sem `showDeceased`, some quem já morreu
 * e não tem descendentes vivos; quem tem continua aparecendo como ancestral.
 * Devolve null quando não sobra ninguém para mostrar.
 */
export function buildFamilyTree(
  state: GameState,
  { showDeceased }: { showDeceased: boolean },
): TreeUnit | null {
  const members = state.members
  const kidsOf = new Map<MemberId, MemberId[]>()
  for (const member of Object.values(members)) {
    if (member.origin !== 'born') continue
    for (const parentId of member.parentIds) {
      const list = kidsOf.get(parentId) ?? []
      list.push(member.id)
      kidsOf.set(parentId, list)
    }
  }

  const build = (coreId: MemberId): TreeUnit | null => {
    const core = members[coreId]
    const partner = core.partnerId ? members[core.partnerId] : undefined
    const memberIds = partner ? [core.id, partner.id] : [core.id]
    const children = (kidsOf.get(coreId) ?? [])
      .map((id) => members[id])
      .sort((a, b) => a.birthDay - b.birthDay || a.id.localeCompare(b.id, 'en', { numeric: true }))
      .map((child) => build(child.id))
      .filter((unit): unit is TreeUnit => unit !== null)
    const anyAlive = memberIds.some((id) => members[id].deathDay === null)
    if (!showDeceased && !anyAlive && children.length === 0) return null
    return { coreId, memberIds, children }
  }

  const founders = Object.values(members)
    .filter((member) => member.origin === 'founder')
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
  return founders.length > 0 ? build(founders[0].id) : null
}

/**
 * Posiciona a árvore em gerações, de cima para baixo, sem sobreposição: cada
 * subárvore ganha a largura que precisa e o casal fica centralizado sobre os
 * filhos.
 */
export function layoutFamilyTree(root: TreeUnit, metrics: TreeMetrics = TREE_METRICS): TreeLayout {
  const { slot, coupleGap, siblingGap, rowHeight, avatar, padding } = metrics
  const unitWidth = (unit: TreeUnit) =>
    unit.memberIds.length * slot + (unit.memberIds.length - 1) * coupleGap

  const widths = new Map<TreeUnit, number>()
  const measure = (unit: TreeUnit): number => {
    const own = unitWidth(unit)
    const kids = unit.children.reduce((sum, child) => sum + measure(child), 0)
    const kidsWidth = kids + Math.max(0, unit.children.length - 1) * siblingGap
    const width = Math.max(own, kidsWidth)
    widths.set(unit, width)
    return width
  }

  const people: PlacedPerson[] = []
  const couples: CoupleLink[] = []
  const branches: Branch[] = []
  let deepest = 0

  /** Posiciona a subárvore a partir de `left` e devolve o x do avatar do membro de sangue. */
  const place = (unit: TreeUnit, left: number, depth: number): { coreX: number; knotX: number } => {
    deepest = Math.max(deepest, depth)
    const width = widths.get(unit) ?? unitWidth(unit)
    const own = unitWidth(unit)
    const y = padding + avatar / 2 + depth * rowHeight

    const childAnchors: { coreX: number; id: MemberId }[] = []
    if (unit.children.length > 0) {
      const kidsWidth =
        unit.children.reduce((sum, child) => sum + (widths.get(child) ?? 0), 0) +
        (unit.children.length - 1) * siblingGap
      let x = left + (width - kidsWidth) / 2
      for (const child of unit.children) {
        const placed = place(child, x, depth + 1)
        childAnchors.push({ coreX: placed.coreX, id: child.coreId })
        x += (widths.get(child) ?? 0) + siblingGap
      }
    }

    let center = left + width / 2
    if (childAnchors.length > 0) {
      center = (childAnchors[0].coreX + childAnchors[childAnchors.length - 1].coreX) / 2
      center = Math.min(Math.max(center, left + own / 2), left + width - own / 2)
    }
    const start = center - own / 2
    const centers = unit.memberIds.map((id, i) => {
      const x = start + slot / 2 + i * (slot + coupleGap)
      people.push({ id, x, y })
      return x
    })

    const knotX = centers.length === 2 ? (centers[0] + centers[1]) / 2 : centers[0]
    if (centers.length === 2) {
      couples.push({
        aId: unit.memberIds[0],
        bId: unit.memberIds[1],
        x1: centers[0],
        x2: centers[1],
        y,
      })
    }
    const childTop = y + rowHeight - avatar / 2 - 6
    for (const anchor of childAnchors) {
      branches.push({
        fromX: knotX,
        fromY: y,
        toX: anchor.coreX,
        toY: childTop,
        depth,
        childId: anchor.id,
      })
    }
    return { coreX: centers[0], knotX }
  }

  const total = measure(root)
  place(root, padding, 0)
  return {
    width: total + padding * 2,
    height: padding * 2 + avatar + deepest * rowHeight + 40,
    people,
    couples,
    branches,
  }
}
