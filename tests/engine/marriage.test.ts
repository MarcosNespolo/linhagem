import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  ageOf,
  applyAction,
  calendarDate,
  canMeet,
  createRng,
  familyRates,
  isWaiting,
  livingCount,
  MEET_OPTIONS,
  memberIncome,
  PROPOSE_OPTIONS,
  rentedPlaces,
  rollSuitor,
  suggestedPicks,
  weddingCost,
  type Choice,
  type GameState,
} from '@/engine'
import {
  answer,
  days,
  expectOk,
  founders,
  lastMember,
  makeGame,
  marryMember,
  meetSomeone,
  play,
  setMember,
  untilParentAge,
  withAdultChild,
  withAdultChildren,
  withChild,
  withHomes,
  withMoney,
  years,
} from '../helpers'

const YEAR = BALANCE.daysPerYear

/** Joga, com as sugestões, até alguém conhecer uma pessoa; a escolha fica aberta. */
function untilMeeting(state: GameState): GameState {
  const met = play(state, years(4), 'meet')
  expect(met.choices.map((choice) => choice.type)).toContain('meet')
  return met
}

/** Joga até o pedido de casamento; a escolha fica aberta. */
function untilProposal(state: GameState): GameState {
  const asked = play(state, years(2), 'propose')
  expect(asked.choices.map((choice) => choice.type)).toContain('propose')
  return asked
}

/** O pedido cai na mesma data do calendário, um ano depois: 365 dias, ou 366 com um 29 de fevereiro. */
function expectAnniversary(state: GameState, askDay: number, day: number): void {
  const date = (at: number) => calendarDate(state.startDate, at).slice(5)
  expect(date(askDay)).toBe(date(day))
  expect(askDay - day).toBeGreaterThanOrEqual(YEAR)
  expect(askDay - day).toBeLessThanOrEqual(YEAR + 1)
}

function openChoice<T extends Choice['type']>(state: GameState, type: T) {
  const choice = state.choices.find((open) => open.type === type)
  if (!choice) throw new Error(`Sem escolha ${type} aberta`)
  return choice as Extract<Choice, { type: T }>
}

/** Filho adulto que começou a namorar quem conheceu, no dia em que conheceu. */
function dating(seed: number): { state: GameState; childId: string } {
  const { state, childId } = withAdultChild(seed)
  const met = untilMeeting(state)
  expect(openChoice(met, 'meet').memberId).toBe(childId)
  return { state: answer(met, childId, MEET_OPTIONS.date), childId }
}

describe('conhecer alguém', () => {
  it('acontece no carnaval ou no dia dos namorados, e o jogo para até responder', () => {
    const { state, childId } = withAdultChild(2)
    const met = untilMeeting(state)
    const choice = openChoice(met, 'meet')
    expect(choice.memberId).toBe(childId)
    expect(choice.day).toBe(met.clock.day)
    expect(BALANCE.dating.meetDates).toContain(calendarDate(met.startDate, choice.day).slice(5))
    expect(choice.suggested).toBe(MEET_OPTIONS.date)
    expect(isWaiting(met)).toBe(true)
    expect(advance(met, years(1)).state).toBe(met)
  })

  it('a pessoa é adulta, de outro gênero, com idade próxima e vida pela frente', () => {
    const { state, childId } = withAdultChild(2)
    const child = state.members[childId]
    const rng = createRng(2)
    const day = state.clock.day
    for (let i = 0; i < 30; i++) {
      const person = rollSuitor(state, rng, child)
      expect(person.gender).not.toBe(child.gender)
      const age = Math.floor((day - person.birthDay) / YEAR)
      expect(age).toBeGreaterThanOrEqual(BALANCE.adultAge)
      expect(Math.abs(age - ageOf(child, day))).toBeLessThanOrEqual(BALANCE.marriage.maxAgeGapYears)
      expect(person.lifespan).toBeGreaterThan(age)
    }
  })

  it('só conhece alguém quem é adulto, solteiro, vivo, sem namoro e sem escolha aberta', () => {
    const born = withChild(makeGame(3))
    const baby = lastMember(born)
    const [founder] = founders(born)
    expect(canMeet(born, baby)).toBe(false)
    expect(canMeet(born, founder)).toBe(false)

    const { state, childId } = withAdultChild(3)
    expect(canMeet(state, state.members[childId])).toBe(true)
    const dead = setMember(state, childId, { deathDay: state.clock.day })
    expect(canMeet(dead, dead.members[childId])).toBe(false)
    const met = meetSomeone(state, childId)
    expect(canMeet(met, met.members[childId])).toBe(false)
    const together = answer(met, childId, MEET_OPTIONS.date)
    expect(canMeet(together, together.members[childId])).toBe(false)

    const married = marryMember(state, childId)
    const spouse = married.members[married.members[childId].partnerId!]
    expect(canMeet(married, married.members[childId])).toBe(false)
    expect(canMeet(married, spouse)).toBe(false)
  })

  it('agora não: segue solteiro, sem gastar nada, e pode conhecer outra pessoa depois', () => {
    const { state, childId } = withAdultChild(4)
    const met = untilMeeting(state)
    const first = openChoice(met, 'meet').person
    const result = expectOk(
      applyAction(met, {
        type: 'choose',
        picks: [{ memberId: childId, option: MEET_OPTIONS.decline }],
      }),
    )
    expect(result.events).toEqual([])
    expect(result.state.members[childId].dating).toBeNull()
    expect(result.state.money).toBe(met.money)
    expect(result.state.choices).toEqual([])

    const again = untilMeeting(result.state)
    const second = openChoice(again, 'meet')
    expect(second.memberId).toBe(childId)
    expect(second.day).toBeGreaterThan(met.clock.day)
    expect(second.person).not.toEqual(first)
  })
})

describe('namoro e casamento', () => {
  it('namorar começa o namoro e, um ano depois, vem o pedido de casamento', () => {
    const { state, childId } = withAdultChild(5)
    const met = untilMeeting(state)
    const person = openChoice(met, 'meet').person
    const day = met.clock.day
    const result = expectOk(
      applyAction(met, {
        type: 'choose',
        picks: [{ memberId: childId, option: MEET_OPTIONS.date }],
      }),
    )
    const { askDay, ...started } = result.state.members[childId].dating!
    expect(started).toEqual({ partner: person, since: day })
    expectAnniversary(met, askDay, day)
    expect(result.events).toEqual([
      { type: 'datingStarted', day, memberId: childId, partnerName: person.firstName },
    ])

    const asked = untilProposal(result.state)
    const proposal = openChoice(asked, 'propose')
    expect(proposal.memberId).toBe(childId)
    expect(asked.clock.day).toBe(askDay)
    expect(proposal.suggested).toBe(PROPOSE_OPTIONS.marry)
    expect(isWaiting(asked)).toBe(true)
  })

  it('casar traz o par para a família, liga o casal e cobra o casamento', () => {
    const { state: together, childId } = dating(6)
    const partner = together.members[childId].dating!.partner
    const asked = untilProposal(together)
    const result = expectOk(
      applyAction(asked, {
        type: 'choose',
        picks: [{ memberId: childId, option: PROPOSE_OPTIONS.marry }],
      }),
    )
    const married = result.state
    const child = married.members[childId]
    const spouse = married.members[child.partnerId!]

    expect(spouse.firstName).toBe(partner.firstName)
    expect(spouse.origin).toBe('married')
    expect(spouse.partnerId).toBe(childId)
    expect(spouse.generation).toBe(child.generation)
    expect(spouse.parentIds).toEqual([])
    expect(spouse.appearance).toEqual(partner.appearance)
    expect(spouse.dating).toBeNull()
    expect(child.dating).toBeNull()
    expect(child.marriedDay).toBe(married.clock.day)
    expect(married.money).toBe(asked.money - weddingCost())
    expect(married.choices).toEqual([])
    expect(result.events).toEqual([
      { type: 'married', day: married.clock.day, memberId: childId, partnerId: spouse.id },
    ])
  })

  it('depois de muitos anos de namoro, o par ainda chega com vida pela frente', () => {
    const { state: together, childId } = dating(6)
    const child = together.members[childId]
    const partner = child.dating!.partner
    const partnerAge = Math.floor((together.clock.day - partner.birthDay) / YEAR)
    const old = setMember(together, childId, {
      dating: { ...child.dating!, partner: { ...partner, lifespan: partnerAge } },
    })
    const married = marryMember(old, childId)
    const spouse = married.members[married.members[childId].partnerId!]
    expect(spouse.lifespan).toBe(partnerAge + 2)
  })

  it('esperar adia o pedido em um ano, sem gastar nada', () => {
    const { state: together, childId } = dating(7)
    const since = together.members[childId].dating!.since
    const asked = untilProposal(together)
    const result = expectOk(
      applyAction(asked, {
        type: 'choose',
        picks: [{ memberId: childId, option: PROPOSE_OPTIONS.wait }],
      }),
    )
    expect(result.events).toEqual([])
    expect(result.state.money).toBe(asked.money)
    const waiting = result.state.members[childId].dating!
    expect(waiting.since).toBe(since)
    expectAnniversary(asked, waiting.askDay, asked.clock.day)
    const again = untilProposal(result.state)
    expect(again.clock.day).toBe(waiting.askDay)
  })

  it('com um 29 de fevereiro no caminho, o pedido vem 366 dias depois, na mesma data', () => {
    const { state, childId } = withAdultChild(5)
    // O primeiro dia dos namorados seguido de um ano bissexto.
    let day = state.clock.day
    for (;;) {
      const date = calendarDate(state.startDate, day)
      if (date.slice(5) === '06-12' && Number(date.slice(0, 4)) % 4 === 3) break
      day += 1
    }
    const later = { ...state, clock: { ...state.clock, day } }
    const together = answer(meetSomeone(later, childId), childId, MEET_OPTIONS.date)
    const { askDay } = together.members[childId].dating!
    expect(askDay - day).toBe(YEAR + 1)
    expect(calendarDate(state.startDate, askDay).slice(5)).toBe('06-12')
  })

  it('terminar acaba o namoro, e o membro volta a poder conhecer alguém', () => {
    const { state: together, childId } = dating(8)
    const partner = together.members[childId].dating!.partner
    const asked = untilProposal(together)
    const result = expectOk(
      applyAction(asked, {
        type: 'choose',
        picks: [{ memberId: childId, option: PROPOSE_OPTIONS.breakUp }],
      }),
    )
    const child = result.state.members[childId]
    expect(child.dating).toBeNull()
    expect(child.partnerId).toBeNull()
    expect(canMeet(result.state, child)).toBe(true)
    expect(result.events).toEqual([
      {
        type: 'breakup',
        day: asked.clock.day,
        memberId: childId,
        partnerName: partner.firstName,
      },
    ])
  })

  it('sem o dinheiro do casamento, sugere esperar e não deixa casar', () => {
    const { state: together, childId } = dating(9)
    const child = together.members[childId]
    // O pedido chega amanhã, com metade do dinheiro do casamento.
    const soon = setMember(withMoney(together, weddingCost() / 2), childId, {
      dating: { ...child.dating!, askDay: together.clock.day + 1 },
    })
    const asked = untilProposal(soon)
    expect(asked.money).toBeLessThan(weddingCost())
    expect(openChoice(asked, 'propose').suggested).toBe(PROPOSE_OPTIONS.wait)
    expect(
      applyAction(asked, {
        type: 'choose',
        picks: [{ memberId: childId, option: PROPOSE_OPTIONS.marry }],
      }),
    ).toEqual({ ok: false, error: 'optionUnavailable' })
  })

  it('dois pedidos no mesmo dia, com dinheiro para um casamento: só dá para casar um', () => {
    const { state: start, childIds } = withAdultChildren(12)
    let state = start
    for (const id of childIds) state = answer(meetSomeone(state, id), id, MEET_OPTIONS.date)
    for (const id of childIds) {
      const dating = { ...state.members[id].dating!, askDay: state.clock.day + 1 }
      state = setMember(state, id, { dating })
    }
    const asked = play(withMoney(state, weddingCost() * 1.5), days(2), 'propose')
    const proposals = asked.choices.filter((choice) => choice.type === 'propose')
    expect(proposals.map((choice) => choice.memberId).sort()).toEqual([...childIds].sort())
    expect(proposals.map((choice) => choice.suggested)).toEqual([
      PROPOSE_OPTIONS.marry,
      PROPOSE_OPTIONS.wait,
    ])
    const both = proposals.map((choice) => ({
      memberId: choice.memberId,
      option: PROPOSE_OPTIONS.marry,
    }))
    expect(applyAction(asked, { type: 'choose', picks: both })).toEqual({
      ok: false,
      error: 'optionUnavailable',
    })
    const married = expectOk(applyAction(asked, { type: 'choose', picks: suggestedPicks(asked) }))
    expect(married.events.filter((event) => event.type === 'married')).toHaveLength(1)
    expect(married.state.money).toBeGreaterThanOrEqual(0)
  })

  it('com as sugestões, quem namora casa no pedido quando há dinheiro', () => {
    const { state, childId } = withAdultChild(10)
    const later = play(state, years(4))
    const child = later.members[childId]
    expect(child.partnerId).not.toBeNull()
    const types = later.log
      .filter((event) => 'memberId' in event && event.memberId === childId)
      .map((event) => event.type)
    const dated = types.indexOf('datingStarted')
    expect(dated).toBeGreaterThanOrEqual(0)
    expect(types.indexOf('married')).toBeGreaterThan(dated)
  })

  it('o cônjuge trabalha e soma na renda da família', () => {
    const { state, childId } = withAdultChild(4)
    const before = familyRates(state).income
    const married = marryMember(state, childId)
    const spouse = married.members[married.members[childId].partnerId!]
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

  it('sem lugar em casa, o casal fica na família e paga aluguel', () => {
    const { state: full, childIds } = withAdultChildren(5)
    const [childId] = childIds
    const married = marryMember(full, childId)
    const child = married.members[childId]
    const spouse = married.members[child.partnerId!]
    expect(child.deathDay).toBeNull()
    expect(spouse.deathDay).toBeNull()
    expect(livingCount(married)).toBe(livingCount(full) + 1)
    expect(rentedPlaces(married)).toBe(rentedPlaces(full) + 1)
    expect(married.money).toBe(full.money - BALANCE.marriage.cost)
  })

  it('o namoro acaba quando o membro morre', () => {
    const { state: together, childId } = dating(8)
    const child = together.members[childId]
    const age = ageOf(child, together.clock.day)
    const dying = setMember(together, childId, {
      lifespan: age + 1,
      dating: { ...child.dating!, askDay: together.clock.day + 10 * YEAR },
    })
    const { state: after } = advance(dying, years(1) + days(1))
    expect(after.members[childId].deathDay).not.toBeNull()
    expect(after.members[childId].dating).toBeNull()
  })

  it('é determinístico: a mesma partida dá o mesmo namoro e o mesmo casamento', () => {
    const run = () => {
      const { state: together, childId } = dating(11)
      return answer(untilProposal(together), childId, PROPOSE_OPTIONS.marry)
    }
    expect(run()).toEqual(run())
  })
})
