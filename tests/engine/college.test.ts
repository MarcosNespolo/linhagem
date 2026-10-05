import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { degree, DEGREES } from '@/content/schools'
import {
  ageOf,
  applyAction,
  deserialize,
  isEnrollmentDay,
  livingCost,
  memberExpense,
  memberIncome,
  schoolFee,
  schoolScore,
  type Choice,
  type GameState,
  type PathOption,
} from '@/engine'
import {
  chooseSuggested,
  days,
  expectOk,
  founders,
  lastMember,
  makeGame,
  play,
  type Policy,
  withAptitude,
  withChild,
  withMoney,
  years,
} from '../helpers'

type PathChoice = Extract<Choice, { type: 'afterSchool' }>

/** Filho do casal fundador com a aptidão pedida e dinheiro de sobra. */
function child(seed: number, aptitude: number): { state: GameState; childId: string } {
  const born = withMoney(withChild(makeGame(seed)), 50_000_000)
  const childId = lastMember(born).id
  return { state: withAptitude(born, childId, aptitude), childId }
}

/** Joga até o janeiro em que a pessoa termina o médio e devolve a escolha do que fazer depois. */
function afterSchool(start: GameState, memberId: string): { state: GameState; choice: PathChoice } {
  const state = play(start, years(25), 'afterSchool')
  const choice = state.choices.find(
    (open): open is PathChoice => open.type === 'afterSchool' && open.memberId === memberId,
  )
  if (!choice) throw new Error('A escolha depois do médio não abriu')
  return { state, choice }
}

/** Responde a escolha depois do médio com o primeiro caminho disponível que combina. */
function choosePath(
  state: GameState,
  choice: PathChoice,
  match: (option: PathOption) => boolean,
): GameState {
  const option = choice.options.findIndex((candidate) => candidate.available && match(candidate))
  if (option < 0) throw new Error('Nenhum caminho disponível combina')
  const picks = [{ memberId: choice.memberId, option }]
  return expectOk(applyAction(state, { type: 'choose', picks })).state
}

const optionOf = (choice: PathChoice) => choice.options[choice.suggested]

describe('depois do ensino médio', () => {
  it('no janeiro em que faz 18, sai o ENEM e abre a escolha do caminho', () => {
    const start = child(1, 620)
    const { state, choice } = afterSchool(start.state, start.childId)
    const member = state.members[start.childId]

    expect(isEnrollmentDay(state)).toBe(true)
    expect(member.education.enem).toBe(choice.enem)
    expect(Math.abs(choice.enem - Math.round(schoolScore(member)))).toBeLessThanOrEqual(
      BALANCE.college.enemSpread,
    )
    expect(state.log).toContainEqual({
      type: 'enem',
      day: state.clock.day,
      memberId: start.childId,
      score: choice.enem,
    })

    const federal = choice.options.filter(
      (option) => option.path === 'faculdade' && option.network === 'federal',
    )
    expect(federal).toHaveLength(DEGREES.length)
    for (const option of federal) {
      if (option.path !== 'faculdade') continue
      expect(option.available).toBe(choice.enem >= degree(option.degree).cutoff)
    }
    const technical = choice.options.filter((option) => option.path === 'tecnico')
    const network = choice.enem >= BALANCE.college.federalTechCutoff ? 'federal' : 'particular'
    expect(
      technical.every((option) => option.path === 'tecnico' && option.network === network),
    ).toBe(true)
    expect(choice.options.map((option) => option.path)).toContain('cursinho')
    expect(choice.options.map((option) => option.path)).toContain('trabalho')
  })

  it('sugere o curso mais disputado que a nota alcança na universidade federal', () => {
    const start = child(2, 695)
    const { choice } = afterSchool(start.state, start.childId)
    const passed = DEGREES.filter((course) => choice.enem >= course.cutoff)
    expect(passed.length).toBeGreaterThan(0)
    expect(optionOf(choice)).toEqual({
      path: 'faculdade',
      network: 'federal',
      degree: passed[0].id,
      available: true,
    })
  })

  it('com nota baixa, sugere trabalhar; o salário começa em janeiro, antes dos 18', () => {
    const start = child(3, 405)
    const { state, choice } = afterSchool(start.state, start.childId)
    expect(optionOf(choice).path).toBe('trabalho')

    const working = choosePath(state, choice, (option) => option.path === 'trabalho')
    expect(working.choices.map((open) => open.type)).toEqual(['firstJob'])
    const hired = chooseSuggested(working)
    const member = hired.members[start.childId]
    expect(ageOf(member, hired.clock.day)).toBeLessThan(BALANCE.adultAge)
    expect(memberIncome(member, hired.clock.day)).toBeGreaterThan(0)
  })

  it('faculdade particular: mensalidade, nada de salário, e a vaga da área na formatura', () => {
    const start = child(4, 520)
    const { state, choice } = afterSchool(start.state, start.childId)
    const studying = choosePath(
      state,
      choice,
      (option) =>
        option.path === 'faculdade' &&
        option.network === 'particular' &&
        option.degree === 'computacao',
    )
    const student = studying.members[start.childId]
    expect(student.education.school).toEqual({
      stage: 'faculdade',
      network: 'particular',
      degree: 'computacao',
      yearsLeft: degree('computacao').years,
    })
    expect(schoolFee(student.education.school)).toBe(degree('computacao').fee)
    expect(memberIncome(student, studying.clock.day)).toBe(0)

    const graduated = play(studying, years(10), 'firstJob')
    const member = graduated.members[start.childId]
    expect(member.education.formation).toEqual({ level: 'superior', degree: 'computacao' })
    expect(member.education.school).toBeNull()
    // Formada, sai a mensalidade e fica o custo de vida.
    expect(memberExpense(member, graduated.clock.day)).toBe(livingCost(member, graduated.clock.day))
    const yearsStudied = Math.round(
      (graduated.clock.day - studying.clock.day) / BALANCE.daysPerYear,
    )
    expect(yearsStudied).toBe(degree('computacao').years)
    const job = graduated.choices.find((open) => open.type === 'firstJob')
    expect(job?.type === 'firstJob' && job.offers[job.suggested].careerId).toBe('tecnologia')
  })

  it('cursinho: um ano, e o ENEM seguinte vem com os pontos a mais, sem cair', () => {
    for (const seed of [5, 15, 25]) {
      const start = child(seed, 520)
      const { state, choice } = afterSchool(start.state, start.childId)
      const pointsBefore = state.members[start.childId].education.points
      const preparing = choosePath(state, choice, (option) => option.path === 'cursinho')
      expect(schoolFee(preparing.members[start.childId].education.school)).toBe(
        BALANCE.college.prep.fee,
      )

      const again = afterSchool(preparing, start.childId)
      const member = again.state.members[start.childId]
      expect(member.education.points).toBe(pointsBefore + BALANCE.college.prep.points)
      expect(again.choice.enem).toBe(choice.enem + BALANCE.college.prep.points)
      expect(member.education.enem).toBe(again.choice.enem)
      expect(again.state.clock.day - state.clock.day).toBeGreaterThanOrEqual(365)
      expect(again.state.log.filter((event) => event.type === 'enem')).toHaveLength(2)
    }
  })

  it('curso técnico depois do médio: dois anos e forma técnico', () => {
    const start = child(6, 620)
    const { state, choice } = afterSchool(start.state, start.childId)
    const studying = choosePath(
      state,
      choice,
      (option) => option.path === 'tecnico' && option.course === 'informatica',
    )
    const graduated = play(studying, years(5), 'firstJob')
    const member = graduated.members[start.childId]
    expect(member.education.formation).toEqual({ level: 'tecnico', course: 'informatica' })
    const job = graduated.choices.find((open) => open.type === 'firstJob')
    expect(job?.type === 'firstJob' && job.offers[0].careerId).toBe('tecnologia')
  })

  it('alguém passa na federal, alguém paga a particular, e os dois se formam', () => {
    let state = withMoney(makeGame(7), 50_000_000)
    const [mother] = founders(state)
    const ids: string[] = []
    for (let i = 0; i < 2; i++) {
      state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
      ids.push(lastMember(state).id)
      state = play(state, days(BALANCE.children.cooldownDays))
    }
    state = withAptitude(state, ids[0], 695)
    state = withAptitude(state, ids[1], 410)

    // Na federal quando a nota alcança; senão, Licenciatura na particular.
    const policy: Policy = (current) =>
      current.choices.map((open) => {
        if (open.type !== 'afterSchool') return { memberId: open.memberId, option: open.suggested }
        const federal = open.options.findIndex(
          (option) =>
            option.path === 'faculdade' && option.network === 'federal' && option.available,
        )
        const particular = open.options.findIndex(
          (option) =>
            option.path === 'faculdade' &&
            option.network === 'particular' &&
            option.degree === 'licenciatura',
        )
        return { memberId: open.memberId, option: federal >= 0 ? federal : particular }
      })
    state = play(state, years(30), undefined, policy)

    const started = state.log.flatMap((event) =>
      event.type === 'schoolStarted' && event.stage === 'faculdade' ? [event] : [],
    )
    expect(started.find((event) => event.memberId === ids[0])?.network).toBe('federal')
    expect(started.find((event) => event.memberId === ids[1])?.network).toBe('particular')
    for (const id of ids) {
      expect(state.members[id].education.formation?.level).toBe('superior')
      expect(state.log).toContainEqual(
        expect.objectContaining({ type: 'schoolFinished', memberId: id }),
      )
    }
  })

  it('o save da versão 4 ganha a nota do ENEM vazia', () => {
    const json = readFileSync(new URL('../fixtures/save-v4.json', import.meta.url), 'utf8')
    const state = deserialize(json)
    for (const member of Object.values(state.members)) {
      expect(member.education.enem).toBeNull()
    }
  })
})
