import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  ageOf,
  applyAction,
  checkMarry,
  checkSeekPartner,
  familyRates,
  memberIncome,
  weddingCost,
  type GameState,
} from '@/engine'
import {
  days,
  expectOk,
  founders,
  lastMember,
  makeGame,
  marryMember,
  setMember,
  untilParentAge,
  withAdultChild,
  withChild,
  withMoney,
  years,
} from '../helpers'

const find = (state: GameState, memberId: string) =>
  applyAction(state, { type: 'findSuitors', memberId })

describe('procurar par', () => {
  it('sugere três pessoas adultas de outro gênero, com idade próxima e nomes diferentes', () => {
    const { state, childId } = withAdultChild(2)
    const child = state.members[childId]
    const searched = expectOk(find(state, childId)).state
    const suitors = searched.suitors[childId]

    expect(suitors).toHaveLength(BALANCE.marriage.suitorsPerSearch)
    expect(new Set(suitors.map((suitor) => suitor.firstName)).size).toBe(suitors.length)
    const childAge = ageOf(child, searched.clock.day)
    for (const suitor of suitors) {
      expect(suitor.gender).not.toBe(child.gender)
      const age = Math.floor((searched.clock.day - suitor.birthDay) / BALANCE.daysPerYear)
      expect(age).toBeGreaterThanOrEqual(BALANCE.adultAge)
      expect(Math.abs(age - childAge)).toBeLessThanOrEqual(BALANCE.marriage.maxAgeGapYears)
      expect(suitor.lifespan).toBeGreaterThan(age)
    }
  })

  it('procurar de novo troca as sugestões e não cobra nada', () => {
    const { state, childId } = withAdultChild(2)
    const first = expectOk(find(state, childId)).state
    const second = expectOk(find(first, childId)).state
    expect(second.suitors[childId]).not.toEqual(first.suitors[childId])
    expect(second.money).toBe(state.money)
  })

  it('recusa quem ainda não é adulto, já casou ou morreu', () => {
    const born = withChild(makeGame(3))
    const child = lastMember(born)
    expect(find(born, child.id)).toEqual({ ok: false, error: 'tooYoung' })

    const [founder] = founders(born)
    expect(find(born, founder.id)).toEqual({ ok: false, error: 'alreadyMarried' })

    const dead = setMember(born, child.id, { deathDay: born.clock.day })
    expect(checkSeekPartner(dead, child.id)).toEqual({ ok: false, error: 'memberDeceased' })
    expect(checkSeekPartner(born, 'nao-existe')).toEqual({ ok: false, error: 'memberNotFound' })
  })
})

describe('casar', () => {
  it('traz a pessoa escolhida para a família, liga o casal e cobra o casamento', () => {
    const { state, childId } = withAdultChild(4)
    const searched = expectOk(find(state, childId)).state
    const chosen = searched.suitors[childId][1]
    const cost = weddingCost(searched)

    const result = expectOk(
      applyAction(searched, { type: 'marry', memberId: childId, suitorIndex: 1 }),
    )
    const married = result.state
    const child = married.members[childId]
    const spouse = married.members[child.partnerId ?? '']

    expect(spouse.firstName).toBe(chosen.firstName)
    expect(spouse.origin).toBe('married')
    expect(spouse.partnerId).toBe(childId)
    expect(spouse.generation).toBe(child.generation)
    expect(spouse.parentIds).toEqual([])
    expect(spouse.appearance).toEqual(chosen.appearance)
    expect(child.marriedDay).toBe(married.clock.day)
    expect(married.money).toBe(searched.money - cost)
    expect(married.suitors[childId]).toBeUndefined()
    expect(result.events).toEqual([
      { type: 'married', day: married.clock.day, memberId: childId, partnerId: spouse.id },
    ])
  })

  it('o cônjuge trabalha e soma na renda da família', () => {
    const { state, childId } = withAdultChild(4)
    const before = familyRates(state).income
    const married = marryMember(state, childId)
    const spouse = married.members[married.members[childId].partnerId ?? '']
    expect(familyRates(married).income).toBeCloseTo(
      before + memberIncome(spouse, married.clock.day),
    )
  })

  it('o casal novo pode ter filhos, que entram na geração seguinte', () => {
    const { state, childId } = withAdultChild(4)
    const married = untilParentAge(marryMember(state, childId))
    const withGrandchild = expectOk(
      applyAction(married, { type: 'haveChild', parentId: childId }),
    ).state
    const grandchild = lastMember(withGrandchild)
    expect(grandchild.generation).toBe(2)
    expect(grandchild.parentIds).toContain(childId)
  })

  it('custa mais conforme a família viva cresce', () => {
    const { state, childId } = withAdultChild(5)
    const living = Object.keys(state.members).length
    const first = weddingCost(state)
    const married = marryMember(state, childId)
    expect(first).toBe(Math.round(BALANCE.marriage.baseCost * BALANCE.familySizeGrowth ** living))
    expect(weddingCost(married)).toBeGreaterThan(first)
  })

  it('exige dinheiro suficiente e uma sugestão válida', () => {
    const { state, childId } = withAdultChild(6)
    const searched = expectOk(find(state, childId)).state
    const broke = withMoney(searched, weddingCost(searched) - 1)
    expect(checkMarry(broke, childId, 0)).toEqual({ ok: false, error: 'notEnoughMoney' })
    expect(checkMarry(searched, childId, 9)).toEqual({ ok: false, error: 'suitorNotFound' })
    expect(checkMarry(state, childId, 0)).toEqual({ ok: false, error: 'suitorNotFound' })
  })

  it('não deixa casar de novo, nem quem entrou na família casando', () => {
    const { state, childId } = withAdultChild(7)
    const married = marryMember(state, childId)
    const spouseId = married.members[childId].partnerId ?? ''
    expect(find(married, childId)).toEqual({ ok: false, error: 'alreadyMarried' })
    expect(find(married, spouseId)).toEqual({ ok: false, error: 'alreadyMarried' })
  })

  it('as sugestões somem quando o membro morre', () => {
    const { state, childId } = withAdultChild(8)
    const searched = expectOk(find(state, childId)).state
    const age = ageOf(searched.members[childId], searched.clock.day)
    const dying = setMember(searched, childId, { lifespan: age + 1 })
    const { state: after } = advance(dying, years(1) + days(1))
    expect(after.members[childId].deathDay).not.toBeNull()
    expect(after.suitors[childId]).toBeUndefined()
  })

  it('é determinístico: a mesma sequência de ações dá o mesmo casamento', () => {
    const run = () => {
      const { state, childId } = withAdultChild(9)
      return marryMember(state, childId, 2)
    }
    expect(run()).toEqual(run())
  })
})
