import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  applyAction,
  baseAptitude,
  deserialize,
  hashString,
  inheritAptitude,
  schoolScore,
  suitorAptitude,
  type GameState,
  type Member,
} from '@/engine'
import {
  expectOk,
  founders,
  lastMember,
  makeGame,
  untilParentAge,
  withAdultChild,
  withAptitude,
  withChild,
  withMoney,
} from '../helpers'

const { min, spread, heritability, noise } = BALANCE.aptitude
const max = min + 2 * spread
const middle = min + spread
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

/** Filho do casal fundador quando os dois têm a aptidão pedida. */
function childOf(seed: number, parents: number): Member {
  const game = makeGame(seed)
  const [first, second] = founders(game)
  const state = withAptitude(withAptitude(game, first.id, parents), second.id, parents)
  return lastMember(withChild(state))
}

/** A fórmula da aptidão antes da herança, que saía da semente do avatar. */
function oldAptitude(avatarSeed: string, id: string): number {
  const first = hashString(`${avatarSeed}:${id}:aptidao`) % (spread + 1)
  const second = hashString(`${id}:${avatarSeed}:aptidao`) % (spread + 1)
  return min + first + second
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

describe('aptidão', () => {
  it('quem funda a família tem a aptidão de nascença, entre 400 e 700', () => {
    for (const seed of SEEDS) {
      for (const member of founders(makeGame(seed))) {
        expect(member.aptitude).toBe(baseAptitude(member.avatarSeed, member.id))
        expect(member.aptitude).toBeGreaterThanOrEqual(min)
        expect(member.aptitude).toBeLessThanOrEqual(max)
      }
    }
  })

  it('os filhos herdam: a média dos pais puxa a partir do meio, mais um sorteio próprio', () => {
    for (const parents of [min, middle, max]) {
      const expected = middle + heritability * (parents - middle)
      for (const seed of SEEDS) {
        const child = childOf(seed, parents)
        expect(child.aptitude).toBe(
          inheritAptitude({ aptitude: parents }, { aptitude: parents }, child),
        )
        expect(child.aptitude).toBeGreaterThanOrEqual(Math.max(min, expected - noise))
        expect(child.aptitude).toBeLessThanOrEqual(Math.min(max, expected + noise))
      }
    }
  })

  it('pais com aptidão alta têm filhos com aptidão mais alta que pais com aptidão baixa', () => {
    const high = SEEDS.map((seed) => childOf(seed, max).aptitude)
    const low = SEEDS.map((seed) => childOf(seed, min).aptitude)
    const average = SEEDS.map((seed) => childOf(seed, middle).aptitude)
    expect(Math.min(...high)).toBeGreaterThan(Math.max(...low))
    expect(mean(high)).toBeGreaterThan(mean(average))
    expect(mean(average)).toBeGreaterThan(mean(low))
    // Filhos de pais na média ficam perto do meio, mas não nascem todos iguais.
    expect(Math.abs(mean(average) - middle)).toBeLessThan(15)
    expect(new Set(average).size).toBeGreaterThan(10)
  })

  it('irmãos herdam dos mesmos pais e ainda assim têm aptidões diferentes', () => {
    let state = withMoney(makeGame(3), 50_000_000)
    const [mother, father] = founders(state)
    const siblings: Member[] = []
    for (let i = 0; i < 3; i++) {
      state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
      siblings.push(lastMember(state))
      state = { ...state, members: { ...state.members } }
      for (const id of [mother.id, father.id]) {
        state.members[id] = { ...state.members[id], lastChildDay: null }
      }
    }
    for (const sibling of siblings) {
      expect(sibling.aptitude).toBe(inheritAptitude(mother, father, sibling))
    }
    expect(new Set(siblings.map((sibling) => sibling.aptitude)).size).toBeGreaterThan(1)
  })

  it('quem casa traz a aptidão que tinha como par, e os netos herdam dela também', () => {
    const { state: start, childId } = withAdultChild(4)
    const searched = expectOk(applyAction(start, { type: 'findSuitors', memberId: childId })).state
    const suitors = searched.suitors[childId]
    for (const suitor of suitors) {
      expect(suitor.aptitude).toBe(suitorAptitude(suitor.avatarSeed))
      expect(suitor.aptitude).toBeGreaterThanOrEqual(min)
      expect(suitor.aptitude).toBeLessThanOrEqual(max)
    }
    const married = expectOk(
      applyAction(searched, { type: 'marry', memberId: childId, suitorIndex: 1 }),
    ).state
    const spouse = lastMember(married)
    expect(spouse.origin).toBe('married')
    expect(spouse.aptitude).toBe(suitors[1].aptitude)

    const ready = withMoney(untilParentAge(married), 50_000_000)
    const born = expectOk(applyAction(ready, { type: 'haveChild', parentId: childId })).state
    const grandchild = lastMember(born)
    expect(grandchild.parentIds).toEqual([childId, spouse.id])
    expect(grandchild.aptitude).toBe(
      inheritAptitude(born.members[childId], born.members[spouse.id], grandchild),
    )
  })

  it('a nota da escola usa a aptidão guardada na pessoa', () => {
    const born = withChild(makeGame(5))
    const child = lastMember(born)
    const strong: GameState = withAptitude(born, child.id, 690)
    const member = strong.members[child.id]
    expect(schoolScore(member)).toBe(690 + member.education.points)
  })

  it('o save antigo mantém a aptidão de cada pessoa, e quem aparece como par ganha a sua', () => {
    let suitors = 0
    for (const version of [4, 9]) {
      const json = readFileSync(
        new URL(`../fixtures/save-v${version}.json`, import.meta.url),
        'utf8',
      )
      const raw = JSON.parse(json) as GameState
      const state = deserialize(json)
      for (const [id, member] of Object.entries(state.members)) {
        expect(member.aptitude).toBe(oldAptitude(raw.members[id].avatarSeed, id))
      }
      for (const suitor of Object.values(state.suitors).flat()) {
        expect(suitor.aptitude).toBe(suitorAptitude(suitor.avatarSeed))
        suitors += 1
      }
    }
    // O save da versão 4 tem pessoas sugeridas como par.
    expect(suitors).toBeGreaterThan(0)
  })
})
