import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES } from '@/content/properties'
import {
  advance,
  baseAptitude,
  CURRENT_SCHEMA_VERSION,
  deserialize,
  initialMarket,
  migrate,
  REAIS_PER_DOLLAR,
  SaveError,
  serialize,
  type GameState,
} from '@/engine'
import { chooseSuggested, makeGame, withChild, years } from '../helpers'

const FIXTURES = new URL('../fixtures/', import.meta.url)
const fixtureFiles = readdirSync(FIXTURES).filter((file) => /^save-v\d+\.json$/.test(file))

/** Anos de casa que a versão 18 dá a quem fundou a família e ainda está no primeiro nível. */
const FOUNDER_HEAD = (BALANCE.adultAge - BALANCE.founder.workSinceAge) * BALANCE.daysPerYear

/**
 * Um membro de um save antigo como as versões 17 e 18 o deixam: a carreira
 * pública única vira um cargo federal, o técnico no primeiro nível e o
 * analista em diante um nível abaixo, também no namoro; ninguém tem proposta
 * de emprego; e quem fundou a família no primeiro nível ganha os anos de
 * casa de jovem aprendiz.
 */
function afterMigrations<T extends { career: unknown; dating?: unknown; origin?: unknown }>(
  member: T,
): T {
  const career = (value: unknown, founder = false) => {
    const old = value as { id: string; level: number; levelSince: number } | null
    if (!old) return old
    const remapped =
      old.id !== 'publico'
        ? old
        : old.level <= 0
          ? { ...old, id: 'tecnicoFederal', level: 0 }
          : { ...old, id: 'analistaFederal', level: old.level - 1 }
    if (founder && remapped.level === 0) {
      return { ...remapped, levelSince: remapped.levelSince - FOUNDER_HEAD }
    }
    return remapped
  }
  const dating = member.dating as { partner: { career: unknown } } | null | undefined
  return {
    ...member,
    career: career(member.career, member.origin === 'founder'),
    jobOffer: null,
    ...(dating
      ? {
          dating: {
            ...dating,
            partner: { ...dating.partner, career: career(dating.partner.career) },
          },
        }
      : {}),
  }
}

function errorFrom(fn: () => unknown): SaveError {
  try {
    fn()
  } catch (error) {
    if (error instanceof SaveError) return error
    throw error
  }
  throw new Error('Era esperado um SaveError')
}

describe('save', () => {
  it('serializa e lê de volta sem perder nada', () => {
    const state = advance(withChild(makeGame()), years(3)).state
    expect(deserialize(serialize(state))).toEqual(state)
  })

  it('tem um save de exemplo da versão atual', () => {
    expect(fixtureFiles).toContain(`save-v${CURRENT_SCHEMA_VERSION}.json`)
  })

  it.each(fixtureFiles)('abre %s, migra e continua o jogo', (file) => {
    const state = chooseSuggested(deserialize(readFileSync(new URL(file, FIXTURES), 'utf8')))
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    const { state: next } = advance(state, 3_600)
    expect(next.clock.day).toBeGreaterThan(state.clock.day)
  })

  it('o save de exemplo da versão atual tem uma escolha aberta, com o relógio parado', () => {
    const json = readFileSync(new URL(`save-v${CURRENT_SCHEMA_VERSION}.json`, FIXTURES), 'utf8')
    const state = deserialize(json)
    expect(state.choices).toHaveLength(1)
    expect(advance(state, 3_600).state).toBe(state)
  })

  it('recusa save de uma versão mais nova que o jogo', () => {
    const json = serialize({ ...makeGame(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })
    expect(errorFrom(() => deserialize(json)).code).toBe('futureVersion')
  })

  it('recusa JSON inválido e save incompleto', () => {
    expect(errorFrom(() => deserialize('{"schemaVersion": 1, ')).code).toBe('corrupt')
    expect(errorFrom(() => deserialize('[]')).code).toBe('corrupt')
    const withoutMoney: Partial<GameState> = makeGame()
    delete withoutMoney.money
    expect(errorFrom(() => deserialize(JSON.stringify(withoutMoney))).code).toBe('corrupt')
  })

  it('aplica as migrações em sequência até a versão alvo', () => {
    const v0 = { ...makeGame(), schemaVersion: 0 }
    const migrations = {
      0: (save: Record<string, unknown>) => ({ ...save, first: true }),
      1: (save: Record<string, unknown>) => ({ ...save, second: true }),
    }
    const migrated = migrate(v0, migrations, 2) as GameState & { first: boolean; second: boolean }
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.first).toBe(true)
    expect(migrated.second).toBe(true)
  })

  it('avisa quando falta uma migração no caminho', () => {
    const v0 = { ...makeGame(), schemaVersion: 0 }
    expect(errorFrom(() => migrate(v0, {}, 1)).code).toBe('missingMigration')
  })

  it('a versão 1 ganha aparência, origem e histórico, sempre iguais', () => {
    const json = readFileSync(new URL('save-v1.json', FIXTURES), 'utf8')
    const v1 = JSON.parse(json) as { members: Record<string, { generation: number }> }
    const state = deserialize(json)

    expect(state.log).toEqual([])
    for (const member of Object.values(state.members)) {
      const before = v1.members[member.id]
      expect(member.origin).toBe(before.generation === 0 ? 'founder' : 'born')
      expect(member.appearance.skin).toBeGreaterThanOrEqual(0)
    }
    expect(deserialize(json)).toEqual(state)
  })

  it('a versão 2 passa o dinheiro para reais, com o mesmo poder de compra, e sem escolhas', () => {
    const json = readFileSync(new URL('save-v2.json', FIXTURES), 'utf8')
    const v2 = JSON.parse(json) as GameState
    const state = deserialize(json)

    expect(state.money).toBe(v2.money * REAIS_PER_DOLLAR)
    expect(state.stats.totalEarned).toBe(v2.stats.totalEarned * REAIS_PER_DOLLAR)
    expect(state.stats.totalSpent).toBe(v2.stats.totalSpent * REAIS_PER_DOLLAR)
    expect(state.stats.simulatedMs).toBe(v2.stats.simulatedMs)
    expect(state.clock).toEqual(v2.clock)
    expect(state.choices).toEqual([])
    for (const [id, member] of Object.entries(state.members)) {
      const {
        education,
        concurso,
        career,
        aptitude,
        unemployedUntil,
        dating,
        course,
        jobOffer,
        ...rest
      } = member
      const { career: before, ...restBefore } = v2.members[id]
      expect(rest).toEqual(restBefore)
      expect(education.formation).toEqual({ level: 'medio' })
      expect(concurso).toBeNull()
      expect(aptitude).toBe(baseAptitude(member.avatarSeed, id))
      expect(unemployedUntil).toBeNull()
      expect(dating).toBeNull()
      expect(course).toBeNull()
      expect(jobOffer).toBeNull()
      // A carreira fica no mesmo nível, com o tempo contando a partir da migração; quem fundou a
      // família no primeiro nível ganha os anos de jovem aprendiz.
      const head = member.origin === 'founder' && before?.level === 0 ? FOUNDER_HEAD : 0
      expect(career).toEqual(
        before && { id: before.id, level: before.level, levelSince: v2.clock.day - head },
      )
    }
  })

  it('a versão 15 começa sem cursos, com as carreiras e os namoros como estavam', () => {
    const json = readFileSync(new URL('save-v15.json', FIXTURES), 'utf8')
    const v15 = JSON.parse(json) as GameState
    const state = deserialize(json)
    for (const [id, member] of Object.entries(state.members)) {
      expect(member).toEqual(afterMigrations({ ...v15.members[id], course: null }))
    }
    expect(state.choices).toEqual(v15.choices)
    expect(state.money).toBe(v15.money)
  })

  it('a versão 16 troca a carreira pública pelos cargos por faixa, sem vazios nem financiamento', () => {
    const json = readFileSync(new URL('save-v16.json', FIXTURES), 'utf8')
    const v16 = JSON.parse(json) as GameState
    const servants = Object.values(v16.members).filter(
      (member) => (member.career?.id as string) === 'publico',
    )
    expect(servants.length).toBeGreaterThan(0)
    const state = deserialize(json)
    for (const [id, member] of Object.entries(state.members)) {
      expect(member).toEqual(afterMigrations(v16.members[id]))
    }
    expect(state.vacancies).toEqual({})
    expect(state.loans).toEqual([])
    expect(state.stats).toEqual({ ...v16.stats, interestPaid: 0 })
    // O histórico aponta para os cargos novos: o técnico que passou é técnico federal.
    const results = state.log.filter((event) => event.type === 'concurso')
    expect(results.length).toBeGreaterThan(0)
    for (const event of results) {
      if (event.type !== 'concurso') continue
      expect(event.careerId).toBe('tecnicoFederal')
    }
    for (const event of state.log) {
      if ('careerId' in event) expect(event.careerId).not.toBe('publico')
    }
    expect(state.money).toBe(v16.money)
  })

  it('a versão 14 começa sem namoros e sem as pessoas sugeridas pela busca antiga', () => {
    const v14 = JSON.parse(readFileSync(new URL('save-v14.json', FIXTURES), 'utf8')) as GameState
    const [single] = Object.keys(v14.members)
    const save = { ...v14, suitors: { [single]: [v14.members[single]] } }
    const state = deserialize(JSON.stringify(save))
    expect('suitors' in state).toBe(false)
    for (const [id, member] of Object.entries(state.members)) {
      expect(member).toEqual(afterMigrations({ ...v14.members[id], dating: null, course: null }))
    }
    // O resultado do concurso aberto no exemplo aponta para o cargo novo.
    expect(state.choices).toEqual(
      v14.choices.map((choice) =>
        choice.type === 'concurso'
          ? {
              ...choice,
              options: choice.options.map((option) =>
                option.kind === 'posse' ? { ...option, careerId: 'tecnicoFederal' } : option,
              ),
            }
          : choice,
      ),
    )
    expect(state.money).toBe(v14.money)
  })

  it('a versão 13 traz de volta quem saiu de casa e começa no azul', () => {
    const v13 = JSON.parse(readFileSync(new URL('save-v13.json', FIXTURES), 'utf8')) as GameState
    const day = v13.clock.day
    const [first, second] = Object.keys(v13.members)
    const away = (id: string, lifespan: number) => ({
      ...v13.members[id],
      leftHome: true,
      deathDay: day - 10,
      birthDay: day - 40 * BALANCE.daysPerYear,
      lifespan,
    })
    const save = {
      ...v13,
      members: { ...v13.members, [first]: away(first, 80), [second]: away(second, 30) },
    }
    const state = deserialize(JSON.stringify(save))
    expect(state.members[first].deathDay).toBeNull()
    expect(state.members[second].deathDay).toBe(day - 10 * BALANCE.daysPerYear)
    for (const member of Object.values(state.members)) expect('leftHome' in member).toBe(false)
    expect(state.debtSince).toBeNull()
    expect(state.bankruptDay).toBeNull()
    expect(state.money).toBe(v13.money)
  })

  it('a versão 12 ganha os lotes do bairro, nos primeiros de cada tipo', () => {
    const json = readFileSync(new URL('save-v12.json', FIXTURES), 'utf8')
    const v12 = JSON.parse(json) as GameState
    const state = deserialize(json)
    for (const type of PROPERTY_TYPES) {
      const shown = Math.min(v12.properties[type.id] ?? 0, type.lots)
      expect(state.lots[type.id] ?? []).toEqual(Array.from({ length: shown }, (_, lot) => lot))
    }
    expect(state.properties).toEqual(v12.properties)
    expect(state.market).toEqual(v12.market)
    expect(state.money).toBe(v12.money)
  })

  it('a versão 11 ganha os comerciais à venda no bairro, com o máximo de cada tipo', () => {
    const json = readFileSync(new URL('save-v11.json', FIXTURES), 'utf8')
    const v11 = JSON.parse(json) as GameState
    const state = deserialize(json)
    expect(state.market).toEqual(initialMarket())
    expect(state.properties).toEqual(v11.properties)
    expect(state.money).toBe(v11.money)
  })

  it('a versão 10 ganha o desemprego e o arquivo da árvore, sem mudar o resto', () => {
    const json = readFileSync(new URL('save-v10.json', FIXTURES), 'utf8')
    const v10 = JSON.parse(json) as GameState
    const state = deserialize(json)
    expect(state.stats).toEqual({ ...v10.stats, archived: 0, interestPaid: 0 })
    for (const [id, member] of Object.entries(state.members)) {
      expect(member).toEqual(
        afterMigrations({
          ...v10.members[id],
          unemployedUntil: null,
          dating: null,
          course: null,
        }),
      )
    }
    expect(state.properties).toEqual(v10.properties)
    expect(state.money).toBe(v10.money)
  })
})
