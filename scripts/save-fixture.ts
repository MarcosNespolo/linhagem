/**
 * Grava um save de exemplo da versão atual em tests/fixtures/save-v<N>.json.
 *
 * Rode antes de criar uma migração nova: os testes abrem todos os saves de
 * exemplo e conferem que continuam funcionando depois da migração. Um arquivo
 * que já existe nunca é sobrescrito, porque representa os saves reais daquela
 * versão.
 *
 * O exemplo passa pelas ações principais do jogo: dois filhos que fizeram a
 * escola com as matrículas sugeridas, um deles com emprego e casado, com um
 * filho na creche, e o outro recém-chegado aos 18, com a escolha do primeiro
 * emprego aberta e pessoas sugeridas como par esperando resposta.
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
// Os dois passam pela escola com as matrículas sugeridas. O relógio para nos 18
// anos do primeiro, que fica com o emprego sugerido, casa e tem um filho.
state = play(state, 19 * year, 'firstJob')
state = act(state, { type: 'choose', picks: suggestedPicks(state) })
state = act(state, { type: 'findSuitors', memberId: 'm3' })
state = act(state, { type: 'marry', memberId: 'm3', suitorIndex: 0 })
state = act(state, { type: 'haveChild', parentId: 'm3' })
// O neto entra na creche, e o relógio para de novo nos 18 anos do segundo filho.
state = play(state, 3 * year, 'firstJob')
state = act(state, { type: 'findSuitors', memberId: 'm4' })
state = advance(state, daysToMs(100)).state
if (state.choices.length !== 1) throw new Error('O exemplo devia terminar com uma escolha aberta')

mkdirSync('tests/fixtures', { recursive: true })
writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`)
console.log(`Save de exemplo gravado em ${path}`)
