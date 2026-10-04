import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { applyAction, type GameState } from '@/engine'
import { buildFamilyTree, layoutFamilyTree, TREE_METRICS } from '@/ui/tree/layout'
import {
  days,
  expectOk,
  founders,
  makeGame,
  marryMember,
  play,
  setMember,
  untilParentAge,
  withMoney,
  years,
} from '../helpers'

/** Família com três filhos, o mais velho casado e com um filho. */
function bigFamily(): GameState {
  let state = withMoney(makeGame(12), 1e9)
  const [mother] = founders(state)
  for (let i = 0; i < 3; i++) {
    state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
    state = play(state, days(BALANCE.children.cooldownDays))
  }
  state = play(state, years(BALANCE.adultAge))
  const firstChild = Object.values(state.members).find((member) => member.generation === 1)!
  state = untilParentAge(marryMember(state, firstChild.id))
  state = expectOk(applyAction(state, { type: 'haveChild', parentId: firstChild.id })).state
  return state
}

function overlaps(layout: ReturnType<typeof layoutFamilyTree>): boolean {
  const byRow = new Map<number, number[]>()
  for (const person of layout.people) {
    const row = byRow.get(person.y) ?? []
    row.push(person.x)
    byRow.set(person.y, row)
  }
  for (const xs of byRow.values()) {
    xs.sort((a, b) => a - b)
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] - xs[i - 1] < TREE_METRICS.slot) return true
    }
  }
  return false
}

describe('árvore da família', () => {
  it('começa pelo casal fundador, lado a lado', () => {
    const state = makeGame()
    const root = buildFamilyTree(state, { showDeceased: false })
    const [mother, father] = founders(state)
    expect(root?.memberIds).toEqual([mother.id, father.id])
    const layout = layoutFamilyTree(root!)
    expect(layout.people).toHaveLength(2)
    expect(layout.couples).toHaveLength(1)
  })

  it('põe cada geração numa linha, sem ninguém sobreposto', () => {
    const state = bigFamily()
    const layout = layoutFamilyTree(buildFamilyTree(state, { showDeceased: true })!)
    expect(layout.people).toHaveLength(Object.keys(state.members).length)
    expect(new Set(layout.people.map((person) => person.y)).size).toBe(3)
    expect(overlaps(layout)).toBe(false)
  })

  it('centraliza o casal entre o primeiro e o último filho', () => {
    const state = bigFamily()
    const root = buildFamilyTree(state, { showDeceased: true })!
    const layout = layoutFamilyTree(root)
    const x = (id: string) => layout.people.find((person) => person.id === id)!.x
    const [mother, father] = root.memberIds
    const knot = (x(mother) + x(father)) / 2
    const first = x(root.children[0].coreId)
    const last = x(root.children.at(-1)!.coreId)
    expect(knot).toBeCloseTo((first + last) / 2)
  })

  it('liga cada filho ao meio do casal por um galho', () => {
    const state = bigFamily()
    const root = buildFamilyTree(state, { showDeceased: true })!
    const layout = layoutFamilyTree(root)
    const children = Object.values(state.members).filter((member) => member.origin === 'born')
    expect(layout.branches.map((branch) => branch.childId).sort()).toEqual(
      children.map((child) => child.id).sort(),
    )
  })

  it('esconde quem morreu sem deixar descendentes vivos, mas mantém os ancestrais', () => {
    const state = bigFamily()
    const [mother, father] = founders(state)
    const lastChild = Object.values(state.members)
      .filter((m) => m.generation === 1 && m.origin === 'born')
      .at(-1)!
    let ended = setMember(state, mother.id, { deathDay: state.clock.day })
    ended = setMember(ended, father.id, { deathDay: state.clock.day })
    ended = setMember(ended, lastChild.id, { deathDay: state.clock.day })

    const visible = buildFamilyTree(ended, { showDeceased: false })!
    expect(visible.memberIds).toEqual([mother.id, father.id])
    expect(visible.children.map((child) => child.coreId)).not.toContain(lastChild.id)

    const everyone = buildFamilyTree(ended, { showDeceased: true })!
    expect(everyone.children.map((child) => child.coreId)).toContain(lastChild.id)
  })

  it('não mostra nada quando a família inteira já morreu', () => {
    const state = makeGame()
    const [mother, father] = founders(state)
    let ended = setMember(state, mother.id, { deathDay: 0 })
    ended = setMember(ended, father.id, { deathDay: 0 })
    expect(buildFamilyTree(ended, { showDeceased: false })).toBeNull()
  })
})
