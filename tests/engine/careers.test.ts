import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  CAREERS,
  careerLevel,
  MEDIO_CAREERS,
  PUBLIC_CAREER,
  type CareerId,
} from '@/content/careers'
import { degree } from '@/content/schools'
import {
  advance,
  applyAction,
  bestOffer,
  canMeet,
  checkHaveChild,
  courseCandidates,
  courseOffer,
  createRng,
  deserialize,
  familyRates,
  formationCareer,
  memberIncome,
  rollJobOffers,
  rollSuitor,
  type Formation,
  type GameState,
  type Member,
} from '@/engine'
import {
  days,
  expectOk,
  founders,
  makeGame,
  makeStart,
  marryMember,
  meetSomeone,
  setMember,
  withAdultChild,
  withMoney,
  years,
} from '../helpers'

const salary = (id: CareerId, level: number) => careerLevel(id, level).salaryPerMonth
const yearDays = (n: number) => n * BALANCE.daysPerYear

/** Partida em que o casal fundador começa a trabalhar no dia 0, no 1º nível. */
function beginners(seed: number): GameState {
  // Com dinheiro guardado, o salário de começo não leva a família ao vermelho.
  let state = withMoney(makeGame(seed), 1_000_000)
  for (const founder of founders(state)) {
    state = setMember(state, founder.id, {
      career: { id: founder.career!.id, level: 0, levelSince: 0 },
    })
  }
  return state
}

describe('carreiras', () => {
  it('são 12, com 5 níveis, salários que sobem e títulos nas duas formas', () => {
    expect(CAREERS).toHaveLength(12)
    for (const career of CAREERS) {
      expect(career.levels).toHaveLength(5)
      career.levels.forEach((level, index) => {
        expect(level.title.m).not.toBe('')
        expect(level.title.f).not.toBe('')
        if (index > 0) {
          expect(level.salaryPerMonth).toBeGreaterThan(career.levels[index - 1].salaryPerMonth)
        }
      })
    }
  })

  it('as que pedem mais formação pagam mais no primeiro emprego', () => {
    const first = (requires: string) =>
      CAREERS.filter((career) => career.requires === requires).map(
        (career) => career.levels[0].salaryPerMonth,
      )
    expect(Math.max(...first('medio'))).toBeLessThan(Math.min(...first('tecnico')))
    expect(Math.max(...first('tecnico'))).toBeLessThan(Math.min(...first('superior')))
  })
})

describe('vagas por formação', () => {
  const offersFor = (formation: Formation | null, seed = 1) =>
    rollJobOffers(createRng(seed), formation)

  it('com ensino médio, três carreiras de ensino médio diferentes, no primeiro nível', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const offers = offersFor({ level: 'medio' }, seed)
      expect(offers).toHaveLength(BALANCE.jobs.offersPerChoice)
      expect(new Set(offers.map((offer) => offer.careerId)).size).toBe(offers.length)
      for (const offer of offers) {
        expect(MEDIO_CAREERS).toContain(offer.careerId)
        expect(offer.level).toBe(0)
      }
    }
  })

  it('a vaga da área vem sempre, primeiro e sugerida; formação acima entra um nível acima', () => {
    const cases: [Formation, CareerId, number][] = [
      [{ level: 'tecnico', course: 'informatica' }, 'tecnologia', 0],
      [{ level: 'tecnico', course: 'enfermagem' }, 'saude', 0],
      [{ level: 'tecnico', course: 'edificacoes' }, 'construcao', 1],
      [{ level: 'tecnico', course: 'agropecuaria' }, 'agro', 1],
      [{ level: 'superior', degree: 'medicina' }, 'medicina', 0],
      [{ level: 'superior', degree: 'direito' }, 'direito', 0],
      [{ level: 'superior', degree: 'engenharia' }, 'engenharia', 0],
      [{ level: 'superior', degree: 'computacao' }, 'tecnologia', 1],
      [{ level: 'superior', degree: 'enfermagem' }, 'saude', 1],
      [{ level: 'superior', degree: 'licenciatura' }, 'educacao', 0],
    ]
    for (const [formation, careerId, level] of cases) {
      const offers = offersFor(formation)
      expect(offers[0]).toEqual({ careerId, level })
      expect(bestOffer(offers)).toBe(0)
      for (const offer of offers.slice(1)) expect(MEDIO_CAREERS).toContain(offer.careerId)
    }
  })
})

/** Começa o curso do próximo nível do membro. */
function study(state: GameState, memberId: string, dedicated = false): GameState {
  return expectOk(applyAction(state, { type: 'startCourse', memberId, dedicated })).state
}

describe('promoções', () => {
  it('quem funda a família começa no primeiro nível de uma carreira de médio, sem curso', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const [founder] = Object.values(makeStart(seed).members)
      expect(MEDIO_CAREERS).toContain(founder.career!.id)
      expect(founder.career?.level).toBe(0)
      expect(founder.course).toBeNull()
    }
  })

  it('fora do serviço público, ninguém sobe só com o tempo', () => {
    const { state, events } = advance(beginners(11), years(20))
    for (const founder of founders(state)) expect(founder.career?.level).toBe(0)
    expect(events.some((event) => event.type === 'promoted')).toBe(false)
  })

  it('o curso no ritmo normal leva 1 ano para o 2º nível, custa meio aumento por mês e sobe no fim', () => {
    const state = beginners(11)
    const [first] = founders(state)
    const careerId = first.career!.id
    const raise = salary(careerId, 1) - salary(careerId, 0)
    expect(courseOffer(first, 0, false)).toEqual({
      memberId: first.id,
      level: 1,
      dedicated: false,
      days: yearDays(1),
      fee: raise / 2,
    })

    const studying = study(state, first.id)
    expect(studying.members[first.id].course).toEqual({
      since: 0,
      until: yearDays(1),
      dedicated: false,
      fee: raise / 2,
    })
    expect(familyRates(studying).expense).toBeCloseTo(familyRates(state).expense + raise / 2)

    const almost = advance(studying, days(yearDays(1) - 1)).state
    expect(almost.members[first.id].career?.level).toBe(0)
    const { state: done, events } = advance(almost, days(1))
    expect(done.members[first.id].career).toEqual({
      id: careerId,
      level: 1,
      levelSince: yearDays(1),
    })
    expect(done.members[first.id].course).toBeNull()
    expect(events).toContainEqual({
      type: 'promoted',
      day: yearDays(1),
      memberId: first.id,
      careerId,
      level: 1,
    })
    expect(familyRates(done).expense).toBeLessThan(familyRates(almost).expense)
  })

  it('com dedicação, o curso dura a metade e custa o dobro por mês, e o casal não tem filho', () => {
    const state = beginners(12)
    const [first, second] = founders(state)
    const raise = salary(first.career!.id, 1) - salary(first.career!.id, 0)
    const fast = courseOffer(first, 0, true)!
    expect(fast).toMatchObject({
      level: 1,
      dedicated: true,
      days: Math.round(yearDays(1) / 2),
      fee: raise,
    })

    const studying = study(state, first.id, true)
    expect(checkHaveChild(studying, first.id)).toEqual({ ok: false, error: 'dedicated' })
    expect(checkHaveChild(studying, second.id)).toEqual({ ok: false, error: 'dedicated' })
    const done = advance(studying, days(fast.days)).state
    expect(done.members[first.id].career?.level).toBe(1)
    expect(checkHaveChild(done, first.id)).toMatchObject({ ok: true })
  })

  it('com dedicação, quem é solteiro não conhece ninguém até terminar', () => {
    const { state, childId } = withAdultChild(5)
    const studying = study(state, childId, true)
    expect(canMeet(studying, studying.members[childId])).toBe(false)
    const until = studying.members[childId].course!.until
    const done = advance(studying, days(until - studying.clock.day)).state
    expect(done.members[childId].course).toBeNull()
    expect(canMeet(done, done.members[childId])).toBe(true)
  })

  it('cada nível pede o seu curso, mais longo, até o topo', () => {
    let state = beginners(13)
    const [first] = founders(state)
    BALANCE.careers.courseYears.forEach((duration, level) => {
      const offer = courseOffer(state.members[first.id], state.clock.day, false)!
      expect(offer).toMatchObject({ level: level + 1, days: yearDays(duration) })
      state = advance(study(state, first.id), days(offer.days)).state
      expect(state.members[first.id].career?.level).toBe(level + 1)
    })
    expect(courseOffer(state.members[first.id], state.clock.day, false)).toBeNull()
    expect(
      applyAction(state, { type: 'startCourse', memberId: first.id, dedicated: false }),
    ).toEqual({ ok: false, error: 'noCourse' })
  })

  it('parar o curso acaba com a mensalidade, sem subir de nível', () => {
    const state = beginners(14)
    const [first] = founders(state)
    const stopped = expectOk(
      applyAction(study(state, first.id), { type: 'stopCourse', memberId: first.id }),
    ).state
    expect(stopped.members[first.id].course).toBeNull()
    expect(familyRates(stopped).expense).toBeCloseTo(familyRates(state).expense)
    expect(advance(stopped, years(2)).state.members[first.id].career?.level).toBe(0)
    expect(applyAction(stopped, { type: 'stopCourse', memberId: first.id })).toEqual({
      ok: false,
      error: 'noCourse',
    })
  })

  it('um curso por vez, e só para quem trabalha fora do serviço público', () => {
    const state = beginners(15)
    const [first, second] = founders(state)
    const studying = study(state, first.id)
    expect(
      applyAction(studying, { type: 'startCourse', memberId: first.id, dedicated: true }),
    ).toEqual({ ok: false, error: 'noCourse' })
    expect(courseCandidates(studying).map((member) => member.id)).toEqual([second.id])

    const offer = (patch: Partial<Member>) =>
      courseOffer(setMember(state, second.id, patch).members[second.id], 0, false)
    expect(offer({ career: null })).toBeNull()
    expect(offer({ career: { id: PUBLIC_CAREER, level: 0, levelSince: 0 } })).toBeNull()
    expect(offer({ unemployedUntil: yearDays(1) })).toBeNull()
  })

  it('quem está demitido tranca o curso e não paga a mensalidade', () => {
    const state = beginners(16)
    const [first] = founders(state)
    const studying = study(state, first.id)
    expect(familyRates(studying).expense).toBeCloseTo(
      familyRates(state).expense + courseOffer(first, 0, false)!.fee,
    )
    const laidOff = setMember(studying, first.id, { unemployedUntil: yearDays(2) })
    expect(familyRates(laidOff).expense).toBeCloseTo(familyRates(state).expense)
  })

  it('quem se aposenta no meio do curso perde o curso e não sobe', () => {
    const start = withMoney(makeGame(12), 1_000_000)
    const [first] = founders(start)
    const almostRetired = setMember(start, first.id, {
      birthDay: -yearDays(BALANCE.retirementAge) + 180,
      career: { id: 'comercio', level: 0, levelSince: -yearDays(10) },
    })
    const later = advance(study(almostRetired, first.id), years(1)).state
    expect(later.members[first.id].course).toBeNull()
    expect(later.members[first.id].career?.level).toBe(0)
    expect(courseOffer(later.members[first.id], later.clock.day, false)).toBeNull()
  })

  it('no serviço público, sobe só com o tempo até o topo, e a aposentadoria paga 70%', () => {
    const start = makeGame(12)
    const [first, second] = founders(start)
    const servant = setMember(start, first.id, {
      career: { id: PUBLIC_CAREER, level: 0, levelSince: 0 },
    })
    const later = advance(servant, years(3 + 5 + 8 + 12)).state
    const member = later.members[first.id]
    expect(member.career?.level).toBe(4)
    expect(courseOffer(member, later.clock.day, false)).toBeNull()

    const atRetirement = (person: Member) => person.birthDay + yearDays(BALANCE.retirementAge)
    expect(memberIncome(member, atRetirement(member))).toBe(
      salary(PUBLIC_CAREER, 4) * BALANCE.publicPensionRatio,
    )
    const other = later.members[second.id]
    expect(memberIncome(other, atRetirement(other))).toBe(
      salary(other.career!.id, other.career!.level) * BALANCE.pensionRatio,
    )
  })
})

describe('quem o membro conhece', () => {
  it('chega com formação, emprego da formação e o nível dos anos de trabalho', () => {
    const { state, childId } = withAdultChild(13)
    const day = state.clock.day
    const rng = createRng(13)
    for (let i = 0; i < 90; i++) {
      const person = rollSuitor(state, rng, state.members[childId])
      const { formation, career } = person
      expect(career.level).toBeLessThanOrEqual(2)
      expect(career.levelSince).toBeLessThanOrEqual(day)
      // Só tem faculdade ou curso técnico quem já teve tempo de terminar.
      const age = (day - person.birthDay) / BALANCE.daysPerYear
      if (formation.level === 'superior') {
        expect(age).toBeGreaterThanOrEqual(BALANCE.adultAge + degree(formation.degree).years)
      }
      if (formation.level === 'tecnico') {
        expect(age).toBeGreaterThanOrEqual(BALANCE.adultAge + BALANCE.college.technical.years)
      }
      if (career.id === PUBLIC_CAREER) continue
      // Com curso técnico ou faculdade, trabalha na área; com ensino médio, numa carreira dele.
      if (formation.level === 'medio') expect(MEDIO_CAREERS).toContain(career.id)
      else expect(career.id).toBe(formationCareer(formation))
      if (formation.level === 'medio' && age >= BALANCE.adultAge + 3) {
        expect(career.level).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('quem casa entra na família com a formação e o emprego que tinha', () => {
    const { state, childId } = withAdultChild(14)
    const [met] = meetSomeone(state, childId).choices
    if (met.type !== 'meet') throw new Error('Esperava a escolha de quem apareceu')
    const married = marryMember(state, childId)
    const spouse = married.members[married.members[childId].partnerId!]
    expect(spouse.education.formation).toEqual(met.person.formation)
    expect(spouse.career).toEqual(met.person.career)
  })
})

describe('save da versão 5', () => {
  const json = readFileSync(new URL('../fixtures/save-v5.json', import.meta.url), 'utf8')

  it('conta o tempo no nível a partir da migração, sem concurso e sem o campo de experiência', () => {
    const raw = JSON.parse(json)
    const state = deserialize(json)
    for (const member of Object.values(state.members)) {
      expect(member.concurso).toBeNull()
      if (!member.career) continue
      expect(member.career.levelSince).toBe(raw.clock.day)
      expect(member.career).not.toHaveProperty('xp')
    }
  })

  it('a vaga aberta ganha o nível de entrada e a opção do concurso', () => {
    const raw = JSON.parse(json)
    raw.choices = [
      {
        type: 'firstJob',
        memberId: 'm4',
        day: raw.clock.day,
        offers: [{ careerId: 'comercio' }],
        suggested: 0,
      },
    ]
    const state = deserialize(JSON.stringify(raw))
    expect(state.choices).toEqual([
      {
        type: 'firstJob',
        memberId: 'm4',
        day: raw.clock.day,
        offers: [{ careerId: 'comercio', level: 0 }],
        concurso: true,
        suggested: 0,
      },
    ])
  })
})
