import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  CAREERS,
  careerLevel,
  concursoOf,
  MEDIO_CAREERS,
  PUBLIC_CAREERS,
  PUBLIC_MEDIO_CAREERS,
  type CareerId,
} from '@/content/careers'
import { degree } from '@/content/schools'
import {
  advance,
  applyAction,
  bestOffer,
  betterCareers,
  canMeet,
  checkHaveChild,
  courseAvailableDay,
  courseCandidates,
  courseOffer,
  createRng,
  deserialize,
  familyRates,
  formationCareer,
  hasJobOffer,
  memberIncome,
  membersWithJobOffer,
  rollJobOffers,
  rollSuitor,
  type Formation,
  type GameState,
  type Member,
} from '@/engine'
import {
  chooseSuggested,
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

/** Dia em que quem está há tempo bastante no nível para o curso chegou a ele. */
const SETTLED = -yearDays(BALANCE.careers.minYearsInLevel)

/**
 * Partida em que o casal fundador trabalha no 1º nível de uma carreira
 * privada, há tempo bastante no nível para começar um curso.
 */
function beginners(seed: number): GameState {
  // Com dinheiro guardado, o salário de começo não leva a família ao vermelho.
  let state = withMoney(makeGame(seed), 1_000_000)
  for (const founder of founders(state)) {
    state = setMember(state, founder.id, {
      career: { id: MEDIO_CAREERS[seed % MEDIO_CAREERS.length], level: 0, levelSince: SETTLED },
    })
  }
  return state
}

describe('carreiras', () => {
  it('são 16, com 5 níveis, salários que sobem e títulos nas duas formas', () => {
    expect(CAREERS).toHaveLength(16)
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

  it('o serviço público tem cinco cargos, da prefeitura à auditoria, por nota de corte', () => {
    expect(PUBLIC_CAREERS).toEqual([
      'prefeitura',
      'estado',
      'tecnicoFederal',
      'analistaFederal',
      'auditoria',
    ])
    expect(PUBLIC_MEDIO_CAREERS).toEqual(['prefeitura', 'estado', 'tecnicoFederal'])
    PUBLIC_CAREERS.forEach((id, index) => {
      if (index === 0) return
      const previous = PUBLIC_CAREERS[index - 1]
      expect(concursoOf(id).cutoff).toBeGreaterThan(concursoOf(previous).cutoff)
      expect(salary(id, 0)).toBeGreaterThan(salary(previous, 0))
    })
    expect(concursoOf('analistaFederal').formation).toBe('superior')
    expect(concursoOf('auditoria').formation).toBe('superior')
    expect(() => concursoOf('comercio')).toThrow()
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
  it('quem funda a família começa no primeiro nível de uma carreira de médio, com o curso já liberado', () => {
    const head = (BALANCE.adultAge - BALANCE.founder.workSinceAge) * BALANCE.daysPerYear
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const start = makeStart(seed)
      const [founder] = Object.values(start.members)
      expect(MEDIO_CAREERS).toContain(founder.career!.id)
      expect(founder.career?.level).toBe(0)
      expect(founder.course).toBeNull()
      // Trabalha desde os 16, como jovem aprendiz: já tem os 2 anos no nível, e um pouco mais,
      // pelos meses desde o aniversário de 18.
      expect(founder.career?.levelSince).toBeLessThanOrEqual(-head)
      expect(founder.career?.levelSince).toBeGreaterThan(-head - BALANCE.daysPerYear)
      expect(courseOffer(founder, 0, false)).toMatchObject({ level: 1 })
      expect(courseCandidates(start).map((member) => member.id)).toEqual([founder.id])
    }
  })

  it('fora do serviço público, ninguém sobe só com o tempo', () => {
    const { state, events } = advance(beginners(11), years(20))
    for (const founder of founders(state)) expect(founder.career?.level).toBe(0)
    expect(events.some((event) => event.type === 'promoted')).toBe(false)
  })

  it('o curso no ritmo normal leva 1 ano para o 2º nível, custa o aumento por mês e sobe no fim', () => {
    const state = beginners(11)
    const [first] = founders(state)
    const careerId = first.career!.id
    const raise = salary(careerId, 1) - salary(careerId, 0)
    expect(courseOffer(first, 0, false)).toEqual({
      memberId: first.id,
      level: 1,
      dedicated: false,
      days: yearDays(1),
      fee: raise,
    })

    const studying = study(state, first.id)
    expect(studying.members[first.id].course).toEqual({
      since: 0,
      until: yearDays(1),
      dedicated: false,
      fee: raise,
    })
    expect(familyRates(studying).expense).toBeCloseTo(familyRates(state).expense + raise)

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
      fee: raise * 2,
    })

    const studying = study(state, first.id, true)
    expect(checkHaveChild(studying, first.id)).toEqual({ ok: false, error: 'dedicated' })
    expect(checkHaveChild(studying, second.id)).toEqual({ ok: false, error: 'dedicated' })
    const done = advance(studying, days(fast.days)).state
    expect(done.members[first.id].career?.level).toBe(1)
    expect(checkHaveChild(done, first.id)).toMatchObject({ ok: true })
  })

  it('com dedicação, quem é solteiro não conhece ninguém até terminar', () => {
    const { state: start, childId } = withAdultChild(5)
    const career = start.members[childId].career!
    const state = setMember(start, childId, { career: { ...career, levelSince: SETTLED } })
    const studying = study(state, childId, true)
    expect(canMeet(studying, studying.members[childId])).toBe(false)
    const until = studying.members[childId].course!.until
    const done = advance(studying, days(until - studying.clock.day)).state
    expect(done.members[childId].course).toBeNull()
    expect(canMeet(done, done.members[childId])).toBe(true)
  })

  it('cada nível pede o seu curso, mais longo, depois de 2 anos no nível, até o topo', () => {
    let state = beginners(13)
    const [first] = founders(state)
    const wait = yearDays(BALANCE.careers.minYearsInLevel)
    BALANCE.careers.courseYears.forEach((duration, level) => {
      const offer = courseOffer(state.members[first.id], state.clock.day, false)!
      expect(offer).toMatchObject({ level: level + 1, days: yearDays(duration) })
      // Uma demissão no meio tranca o curso, que termina mais tarde: anda até o fim dele.
      state = advance(study(state, first.id), days(offer.days)).state
      const until = state.members[first.id].course?.until
      if (until) state = advance(state, days(until - state.clock.day)).state
      const member = state.members[first.id]
      expect(member.career?.level).toBe(level + 1)
      if (level + 1 < BALANCE.careers.courseYears.length) {
        // Recém-promovido, espera o tempo no nível antes do próximo curso.
        expect(courseOffer(member, state.clock.day, false)).toBeNull()
        expect(courseAvailableDay(member.career!)).toBe(state.clock.day + wait)
        state = advance(state, days(wait)).state
      }
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
    expect(offer({ career: { id: 'tecnicoFederal', level: 0, levelSince: SETTLED } })).toBeNull()
    expect(offer({ unemployedUntil: yearDays(1) })).toBeNull()
    // Há menos de 2 anos no nível, ainda não.
    expect(offer({ career: { id: 'comercio', level: 0, levelSince: SETTLED + 1 } })).toBeNull()
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
    const servant = setMember(
      setMember(start, first.id, { career: { id: 'prefeitura', level: 0, levelSince: 0 } }),
      second.id,
      { career: { id: 'comercio', level: 0, levelSince: 0 } },
    )
    const later = advance(servant, years(3 + 5 + 8 + 12)).state
    const member = later.members[first.id]
    expect(member.career?.level).toBe(4)
    expect(courseOffer(member, later.clock.day, false)).toBeNull()

    const atRetirement = (person: Member) => person.birthDay + yearDays(BALANCE.retirementAge)
    expect(memberIncome(member, atRetirement(member))).toBe(
      salary('prefeitura', 4) * BALANCE.publicPensionRatio,
    )
    const other = later.members[second.id]
    expect(other.career?.level).toBe(0)
    expect(memberIncome(other, atRetirement(other))).toBe(
      salary('comercio', 0) * BALANCE.pensionRatio,
    )
  })
})

describe('propostas de emprego', () => {
  const { perYear, maxFamily, minRaise, validMonths } = BALANCE.jobs.offers

  /** Avança dia a dia até alguém receber proposta, respondendo as escolhas com a sugestão. */
  function untilOffer(start: GameState, maxYears = 30): { state: GameState; day: number } {
    let state = start
    for (let i = 0; i < maxYears * BALANCE.daysPerYear; i++) {
      const result = advance(state, days(1))
      state = result.state
      if (result.events.some((event) => event.type === 'jobOffered')) {
        return { state, day: state.clock.day }
      }
      if (state.choices.length > 0) state = chooseSuggested(state)
    }
    throw new Error('Ninguém recebeu proposta')
  }

  it('chega para quem está numa carreira de médio: outra carreira, no mesmo nível, pagando mais', () => {
    const { state, day } = untilOffer(withMoney(makeGame(41), 1e6))
    const member = Object.values(state.members).find((candidate) => candidate.jobOffer)!
    const offer = member.jobOffer!
    const career = member.career!
    expect(MEDIO_CAREERS).toContain(career.id)
    expect(MEDIO_CAREERS).toContain(offer.careerId)
    expect(offer.careerId).not.toBe(career.id)
    expect(offer.level).toBe(career.level)
    expect(salary(offer.careerId, offer.level)).toBeGreaterThanOrEqual(
      salary(career.id, career.level) * (1 + minRaise),
    )
    expect(offer.until).toBe(day + Math.round((validMonths * BALANCE.daysPerYear) / 12))
    expect(betterCareers(member)).toContain(offer.careerId)
    expect(state.log.at(-1)).toMatchObject({ type: 'jobOffered', memberId: member.id })
    expect(state.choices).toEqual([])
    expect(membersWithJobOffer(state).map((candidate) => candidate.id)).toEqual([member.id])

    // Aceitar troca a carreira, no mesmo nível, e zera o tempo nele.
    const accepted = expectOk(
      applyAction(state, { type: 'answerJobOffer', memberId: member.id, accept: true }),
    )
    expect(accepted.state.members[member.id].career).toEqual({
      id: offer.careerId,
      level: offer.level,
      levelSince: day,
    })
    expect(accepted.state.members[member.id].jobOffer).toBeNull()
    expect(accepted.events).toEqual([
      {
        type: 'changedJob',
        day,
        memberId: member.id,
        careerId: offer.careerId,
        level: offer.level,
      },
    ])
    expect(familyRates(accepted.state).income).toBeGreaterThan(familyRates(state).income)

    // Recusar só tira a proposta. Sem proposta, não há o que responder.
    const declined = expectOk(
      applyAction(state, { type: 'answerJobOffer', memberId: member.id, accept: false }),
    ).state
    expect(declined.members[member.id].jobOffer).toBeNull()
    expect(declined.members[member.id].career).toEqual(career)
    expect(
      applyAction(declined, { type: 'answerJobOffer', memberId: member.id, accept: true }),
    ).toEqual({ ok: false, error: 'noJobOffer' })

    // Sem resposta, a proposta deixa de valer no dia marcado.
    const expired = advance(state, days(offer.until - day)).state
    expect(hasJobOffer(expired.members[member.id], expired.clock.day)).toBe(false)
  })

  it('não chega a quem está fora das carreiras de médio, em curso, ou numa família grande', () => {
    const state = makeGame(42)
    const [first] = founders(state)
    const day = state.clock.day
    const without = (patch: Partial<Member>) =>
      betterCareers(setMember(state, first.id, patch).members[first.id])
    expect(without({ career: { id: 'medicina', level: 0, levelSince: 0 } })).toEqual([])
    expect(without({ career: { id: 'prefeitura', level: 0, levelSince: 0 } })).toEqual([])
    expect(without({ career: null })).toEqual([])
    // A carreira de médio que mais paga no nível não recebe proposta melhor.
    const best = MEDIO_CAREERS.reduce((top, id) => (salary(id, 0) > salary(top, 0) ? id : top))
    expect(without({ career: { id: best, level: 0, levelSince: 0 } })).toEqual([])
    expect(perYear).toBeGreaterThan(0)
    expect(maxFamily).toBeGreaterThanOrEqual(2)
    expect(day).toBe(0)
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
      expect(career.level).toBeLessThanOrEqual(BALANCE.careers.backgroundMaxLevel)
      expect(career.levelSince).toBeLessThanOrEqual(day)
      // Só tem faculdade ou curso técnico quem já teve tempo de terminar.
      const age = (day - person.birthDay) / BALANCE.daysPerYear
      if (formation.level === 'superior') {
        expect(age).toBeGreaterThanOrEqual(BALANCE.adultAge + degree(formation.degree).years)
      }
      if (formation.level === 'tecnico') {
        expect(age).toBeGreaterThanOrEqual(BALANCE.adultAge + BALANCE.college.technical.years)
      }
      // Servidor, só num cargo de nível médio.
      if (PUBLIC_CAREERS.includes(career.id)) {
        expect(PUBLIC_MEDIO_CAREERS).toContain(career.id)
        continue
      }
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
    // Quem fundou a família e está no primeiro nível ganha, na versão 18, os anos de jovem aprendiz.
    const head = (BALANCE.adultAge - BALANCE.founder.workSinceAge) * BALANCE.daysPerYear
    for (const member of Object.values(state.members)) {
      expect(member.concurso).toBeNull()
      if (!member.career) continue
      const founderAtStart = member.origin === 'founder' && member.career.level === 0
      expect(member.career.levelSince).toBe(raw.clock.day - (founderAtStart ? head : 0))
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
