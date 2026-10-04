/**
 * Grava um save de exemplo da versão atual em tests/fixtures/save-v<N>.json.
 *
 * Rode antes de criar uma migração nova: os testes abrem todos os saves de
 * exemplo e conferem que continuam funcionando depois da migração. Um arquivo
 * que já existe nunca é sobrescrito, porque representa os saves reais daquela
 * versão.
 *
 * O exemplo passa pelas ações principais do jogo: dois filhos, um deles
 * casado, e o outro com pessoas sugeridas como par esperando resposta.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { BALANCE } from '../src/content/balance'
import {
  advance,
  applyAction,
  CURRENT_SCHEMA_VERSION,
  daysToMs,
  newGame,
  type Action,
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

let state = newGame({
  seed: 20_261_003,
  now: 1_760_000_000_000,
  startDate: '2026-10-03',
  familyName: 'Exemplo',
})
state = { ...state, money: 100_000 }
state = advance(state, 2 * year).state
state = act(state, { type: 'haveChild', parentId: 'm1' })
state = advance(state, 2 * year).state
state = act(state, { type: 'haveChild', parentId: 'm1' })
state = advance(state, 19 * year).state
state = act(state, { type: 'findSuitors', memberId: 'm3' })
state = act(state, { type: 'marry', memberId: 'm3', suitorIndex: 0 })
state = act(state, { type: 'findSuitors', memberId: 'm4' })
state = advance(state, daysToMs(100)).state

mkdirSync('tests/fixtures', { recursive: true })
writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`)
console.log(`Save de exemplo gravado em ${path}`)
