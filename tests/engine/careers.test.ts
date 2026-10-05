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
  affordableCourses,
  applyAction,
  availableCourses,
  bestOffer,
  courseFor,
  createRng,
  deserialize,
  formationCareer,
  isMemberEvent,
  memberIncome,
  rollJobOffers,
  type Formation,
  type GameState,
  type Member,
} from '@/engine'
import {
  expectOk,
  founders,
  makeGame,
  marryMember,
  setMember,
  withAdultChild,
  withMoney,
  years,
} from '../helpers'

const salary = (id: CareerId, level: number) => careerLevel(id, level).salaryPerMonth
const yearDays = (n: number) => n * BALANCE.daysPerYear

/** Partida em que o casal fundador começa a trabalhar no dia 0, no 1º nível. */
function beginners(seed: number): GameState {
  let state = makeGame(seed)
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

describe('promoções', () => {
  it('o casal fundador começa com as promoções dos anos que já trabalhou desde os 18', () => {
    const [toSecond, toThird] = BALANCE.careers.yearsToPromote
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const founder of founders(makeGame(seed))) {
        const worked = -founder.birthDay / BALANCE.daysPerYear - BALANCE.adultAge
        const level = worked >= toSecond + toThird ? 2 : worked >= toSecond ? 1 : 0
        const inLevel = worked - [0, toSecond, toSecond + toThird][level]
        expect(MEDIO_CAREERS).toContain(founder.career!.id)
        expect(founder.career).toMatchObject({
          level,
          levelSince: -Math.floor(inLevel * BALANCE.daysPerYear),
        })
      }
    }
  })

  it('sobe sozinho com 3 e com 5 anos no nível, e para no 3º nível', () => {
    const start = beginners(11)
    const [first] = founders(start)
    const careerId = first.career!.id

    const after3 = advance(start, years(3))
    expect(after3.state.members[first.id].career).toEqual({
      id: careerId,
      level: 1,
      levelSince: yearDays(3),
    })
    expect(after3.events).toContainEqual({
      type: 'promoted',
      day: yearDays(3),
      memberId: first.id,
      careerId,
      level: 1,
    })

    const after8 = advance(after3.state, years(5)).state
    expect(after8.members[first.id].career?.level).toBe(2)
    const after20 = advance(after8, years(12)).state
    expect(after20.members[first.id].career?.level).toBe(2)
  })

  it('o curso do 4º nível sai depois de 8 anos no 3º, custa 24 meses do aumento e promove na hora', () => {
    const before = advance(beginners(11), years(16) - 1).state
    const [first] = founders(before)
    const careerId = first.career!.id
    expect(courseFor(first, before.clock.day)).toBeNull()

    const state = advance(before, 1).state
    const member = state.members[first.id]
    const cost = BALANCE.careers.courseMonths * (salary(careerId, 3) - salary(careerId, 2))
    expect(courseFor(member, state.clock.day)).toEqual({ memberId: first.id, level: 3, cost })

    const short = applyAction(withMoney(state, cost - 1), { type: 'payCourse', memberId: first.id })
    expect(short).toEqual({ ok: false, error: 'notEnoughMoney' })

    const paid = expectOk(
      applyAction(withMoney(state, cost), { type: 'payCourse', memberId: first.id }),
    )
    const day = state.clock.day
    expect(paid.state.money).toBe(0)
    expect(paid.state.members[first.id].career).toEqual({ id: careerId, level: 3, levelSince: day })
    expect(paid.events).toEqual([{ type: 'promoted', day, memberId: first.id, careerId, level: 3 }])
    expect(paid.state.log.at(-1)).toEqual(paid.events[0])
    // O 5º nível pede mais 12 anos e outro curso.
    expect(courseFor(paid.state.members[first.id], day)).toBeNull()
    const later = advance(paid.state, years(12)).state
    expect(later.members[first.id].career?.level).toBe(3)
    expect(courseFor(later.members[first.id], later.clock.day)?.level).toBe(4)
  })

  it('pagar todos os cursos paga do mais barato ao mais caro enquanto houver dinheiro', () => {
    const state = advance(beginners(11), years(16)).state
    const courses = availableCourses(state)
    expect(courses).toHaveLength(2)
    expect(courses[0].cost).toBeLessThanOrEqual(courses[1].cost)
    const both = courses[0].cost + courses[1].cost

    const some = withMoney(state, both - 1)
    expect(affordableCourses(some)).toEqual([courses[0]])
    const one = expectOk(applyAction(some, { type: 'payAllCourses' }))
    expect(one.events.filter(isMemberEvent).map((event) => event.memberId)).toEqual([
      courses[0].memberId,
    ])
    expect(one.state.money).toBe(courses[1].cost - 1)

    const all = expectOk(applyAction(withMoney(state, both), { type: 'payAllCourses' }))
    expect(all.events).toHaveLength(2)
    expect(all.state.money).toBe(0)
    expect(applyAction(all.state, { type: 'payAllCourses' })).toEqual({
      ok: false,
      error: 'noCourse',
    })
    expect(applyAction(withMoney(state, 0), { type: 'payAllCourses' })).toEqual({
      ok: false,
      error: 'notEnoughMoney',
    })
  })

  it('quem se aposentou não sobe mais', () => {
    const start = makeGame(12)
    const [first] = founders(start)
    const retired = setMember(start, first.id, {
      birthDay: -yearDays(BALANCE.retirementAge),
      career: { id: 'comercio', level: 0, levelSince: -yearDays(10) },
    })
    const later = advance(retired, years(1)).state
    expect(later.members[first.id].career?.level).toBe(0)
    expect(courseFor(later.members[first.id], later.clock.day)).toBeNull()
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
    expect(availableCourses(later).map((course) => course.memberId)).not.toContain(first.id)

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

describe('quem é sugerido como par', () => {
  it('chega com formação, emprego da formação e o nível dos anos de trabalho', () => {
    const adult = withAdultChild(13)
    let state = adult.state
    const day = state.clock.day
    for (let i = 0; i < 30; i++) {
      state = expectOk(applyAction(state, { type: 'findSuitors', memberId: adult.childId })).state
      for (const suitor of state.suitors[adult.childId]) {
        const { formation, career } = suitor
        expect(career.level).toBeLessThanOrEqual(2)
        expect(career.levelSince).toBeLessThanOrEqual(day)
        // Só tem faculdade ou curso técnico quem já teve tempo de terminar.
        const age = (day - suitor.birthDay) / BALANCE.daysPerYear
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
    }
  })

  it('quem casa entra na família com a formação e o emprego que tinha', () => {
    const { state, childId } = withAdultChild(14)
    const searched = expectOk(applyAction(state, { type: 'findSuitors', memberId: childId })).state
    const suitor = searched.suitors[childId][0]
    const married = marryMember(state, childId, 0)
    const spouse = married.members[married.members[childId].partnerId!]
    expect(spouse.education.formation).toEqual(suitor.formation)
    expect(spouse.career).toEqual(suitor.career)
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
    raw.suitors = { m4: [{ ...raw.members.m1, career: { id: 'agro', level: 1, xp: 0 } }] }
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
    const [suitor] = state.suitors.m4
    expect(suitor.formation).toEqual({ level: 'medio' })
    expect(suitor.career).toEqual({ id: 'agro', level: 1, levelSince: raw.clock.day })
  })
})
