/**
 * Grava um save de exemplo da versão atual em tests/fixtures/save-v<N>.json.
 *
 * Rode antes de criar uma migração nova: os testes abrem todos os saves de
 * exemplo e conferem que continuam funcionando depois da migração. Um arquivo
 * que já existe nunca é sobrescrito, porque representa os saves reais daquela
 * versão.
 *
 * O exemplo passa pelas ações principais do jogo: dois filhos que fizeram a
 * escola com as matrículas sugeridas. O mais velho faz Direito numa faculdade
 * particular, casou e tem um filho na creche. O mais novo acabou o médio e
 * estuda para concurso, com o resultado da primeira prova aberto. A fundadora
 * pagou o curso e chegou ao 4º nível da carreira, e o fundador tem o curso
 * dele para pagar.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { BALANCE } from '../src/content/balance'
import {
  advance,
  applyAction,
  CURRENT_SCHEMA_VERSION,
  daysToMs,
  msToTicks,
  newGame,
  suggestedPicks,
  TICKS_PER_DAY,
  TICKS_PER_MS,
  type Action,
  type Choice,
  type GameState,
} from '../src/engine'

const path = `tests/fixtures/save-v${CURRENT_SCHEMA_VERSION}.json`

if (existsSync(path)) {
  console.log(`${path} já existe; nada a fazer.`)
  process.exit(0)
}

const year = daysToMs(BALANCE.daysPerYear)

function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action)
  if (!result.ok) throw new Error(`Ação ${action.type} recusada no exemplo: ${result.error}`)
  return result.state
}

/** Avança respondendo as escolhas com a sugestão; para na primeira escolha de `stopAt`. */
function play(game: GameState, ms: number, stopAt?: Choice['type']): GameState {
  const clockMs = (state: GameState) =>
    (state.clock.day * TICKS_PER_DAY + state.clock.tickOfDay) / TICKS_PER_MS
  let current = game
  let left = ms
  while (msToTicks(left) > 0) {
    const before = clockMs(current)
    current = advance(current, left).state
    left -= clockMs(current) - before
    if (current.choices.length === 0) break
    if (current.choices.some((choice) => choice.type === stopAt)) break
    current = act(current, { type: 'choose', picks: suggestedPicks(current) })
  }
  return current
}

let state = newGame({
  seed: 20_261_003,
  now: 1_760_000_000_000,
  startDate: '2026-10-03',
  familyName: 'Exemplo',
})
state = { ...state, money: 18_000_000 }
state = play(state, 2 * year)
state = act(state, { type: 'haveChild', parentId: 'm1' })
state = play(state, 2 * year)
state = act(state, { type: 'haveChild', parentId: 'm1' })
// Os dois passam pela escola com as matrículas sugeridas. No janeiro em que o
// mais velho faz 18, ele vai para Direito numa faculdade particular.
state = play(state, 16 * year, 'afterSchool')
const afterSchool = state.choices.find((choice) => choice.type === 'afterSchool')
if (afterSchool?.type !== 'afterSchool') throw new Error('O exemplo devia parar depois do médio')
const law = afterSchool.options.findIndex(
  (option) =>
    option.path === 'faculdade' && option.network === 'particular' && option.degree === 'direito',
)
state = act(state, { type: 'choose', picks: [{ memberId: afterSchool.memberId, option: law }] })
// Já com 18, casa e tem um filho, que entra na creche.
state = play(state, year)
state = act(state, { type: 'findSuitors', memberId: 'm3' })
state = act(state, { type: 'marry', memberId: 'm3', suitorIndex: 0 })
state = act(state, { type: 'haveChild', parentId: 'm3' })
// No janeiro em que o mais novo faz 18, ele vai trabalhar e escolhe estudar para concurso.
state = play(state, 2 * year, 'afterSchool')
state = act(state, {
  type: 'choose',
  picks: state.choices.map((choice) => ({
    memberId: choice.memberId,
    option:
      choice.type === 'afterSchool'
        ? choice.options.findIndex((option) => option.path === 'trabalho')
        : choice.suggested,
  })),
})
const job = state.choices.find((choice) => choice.type === 'firstJob')
if (job?.type !== 'firstJob' || !job.concurso) throw new Error('O exemplo devia abrir o emprego')
state = act(state, {
  type: 'choose',
  picks: [{ memberId: job.memberId, option: job.offers.length }],
})
// A fundadora paga o curso e sobe para o 4º nível; o do fundador fica para depois.
state = act(state, { type: 'payCourse', memberId: 'm1' })
// Até a primeira prova, que abre o resultado do concurso.
state = advance(state, year).state
if (state.choices.length !== 1 || state.choices[0].type !== 'concurso') {
  throw new Error('O exemplo devia terminar com o resultado do concurso aberto')
}

mkdirSync('tests/fixtures', { recursive: true })
writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`)
console.log(`Save de exemplo gravado em ${path}`)
