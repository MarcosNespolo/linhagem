import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  ageOf,
  applyAction,
  checkMarry,
  checkSeekPartner,
  familyRates,
  freePlaces,
  lifeEndDay,
  livesAway,
  livingCount,
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
  withAdultChildren,
  withChild,
  withHomes,
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
    const cost = weddingCost()

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
    const married = untilParentAge(marryMember(withHomes(state, { kitnet: 1 }), childId))
    const withGrandchild = expectOk(
      applyAction(married, { type: 'haveChild', parentId: childId }),
    ).state
    const grandchild = lastMember(withGrandchild)
    expect(grandchild.generation).toBe(2)
    expect(grandchild.parentIds).toContain(childId)
  })

  it('custa sempre o mesmo, com qualquer tamanho de família', () => {
    const one = withAdultChild(5)
    const two = withAdultChildren(5)
    expect(weddingCost()).toBe(BALANCE.marriage.cost)
    const families: [GameState, string][] = [
      [one.state, one.childId],
      [withHomes(two.state, { kitnet: 1 }), two.childIds[0]],
    ]
    for (const [family, childId] of families) {
      const married = marryMember(family, childId)
      expect(family.money - married.money).toBe(BALANCE.marriage.cost)
    }
  })

  it('sem lugar em casa, o casal sai para formar a própria família', () => {
    const { state: full, childIds } = withAdultChildren(5)
    const [childId] = childIds
    expect(livingCount(full)).toBe(BALANCE.housing.rentedPlaces)
    expect(freePlaces(full)).toBe(0)
    const searched = expectOk(find(full, childId)).state
    expect(checkMarry(searched, childId, 0)).toMatchObject({ ok: true, leavesHome: true })

    const result = expectOk(
      applyAction(searched, { type: 'marry', memberId: childId, suitorIndex: 0 }),
    )
    const married = result.state
    const child = married.members[childId]
    const spouse = married.members[child.partnerId ?? '']
    const day = married.clock.day
    expect(result.events).toEqual([
      { type: 'married', day, memberId: childId, partnerId: spouse.id },
      { type: 'leftHome', day, memberId: childId, partnerId: spouse.id },
    ])
    for (const person of [child, spouse]) {
      expect(person.leftHome).toBe(true)
      expect(person.deathDay).toBe(day)
      expect(livesAway(person, day)).toBe(true)
    }
    expect(livingCount(married)).toBe(livingCount(full) - 1)
    expect(married.money).toBe(searched.money - BALANCE.marriage.cost)
    expect(familyRates(married).income).toBeLessThan(familyRates(full).income)

    // Fora de casa, a idade continua contando até a expectativa de vida.
    const tenYears = day + 10 * BALANCE.daysPerYear
    expect(ageOf(child, tenYears)).toBe(ageOf(child, day) + 10)
    expect(livesAway(child, lifeEndDay(child) - 1)).toBe(true)
    expect(livesAway(child, lifeEndDay(child))).toBe(false)
    expect(ageOf(child, lifeEndDay(child) + 1_000)).toBe(child.lifespan)
  })

  it('com lugar em casa, o casal fica na família', () => {
    const { state, childIds } = withAdultChildren(5)
    const [childId] = childIds
    const searched = expectOk(find(withHomes(state, { kitnet: 1 }), childId)).state
    expect(checkMarry(searched, childId, 0)).toMatchObject({ ok: true, leavesHome: false })
    const married = marryMember(searched, childId)
    expect(married.members[childId].leftHome).toBe(false)
    expect(married.members[childId].deathDay).toBeNull()
  })

  it('exige dinheiro suficiente e uma sugestão válida', () => {
    const { state, childId } = withAdultChild(6)
    const searched = expectOk(find(state, childId)).state
    const broke = withMoney(searched, weddingCost() - 1)
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
