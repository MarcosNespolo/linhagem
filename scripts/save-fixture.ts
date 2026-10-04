/**
 * Grava um save de exemplo da versão atual em tests/fixtures/save-v<N>.json.
 *
 * Rode antes de criar uma migração nova: os testes abrem todos os saves de
 * exemplo e conferem que continuam funcionando depois da migração. Um arquivo
 * que já existe nunca é sobrescrito, porque representa os saves reais daquela
 * versão.
 *
 * O exemplo passa pelas ações principais do jogo: dois filhos, com a aptidão
 * herdada dos pais, que fizeram a escola com as matrículas sugeridas. O mais velho faz Direito numa faculdade
 * particular e casou. O mais novo teve professor particular no médio, acabou e
 * estuda para concurso, com o resultado da primeira prova aberto. A fundadora
 * pagou o curso e chegou ao 4º nível da carreira, e o fundador tem o curso
 * dele para pagar. A família tem dois kitnets e um apartamento alugados, e as
 * missões do dia sorteadas: cumpriu a Investidor, com três kitnets a mais, e
 * está com a renda em dobro.
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
// O mais novo, no médio, ganha um professor particular até o fim da escola.
state = act(state, { type: 'setTutor', memberId: 'm4', active: true })
// Já com 18, o mais velho casa.
state = play(state, year)
state = act(state, { type: 'findSuitors', memberId: 'm3' })
state = act(state, { type: 'marry', memberId: 'm3', suitorIndex: 0 })
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
// A família compra dois kitnets e um apartamento para alugar.
state = act(state, { type: 'buyProperty', propertyId: 'kitnet' })
state = act(state, { type: 'buyProperty', propertyId: 'kitnet' })
state = act(state, { type: 'buyProperty', propertyId: 'apartamento' })
// O primeiro dia, a partir de 4 de outubro de 2026, em que a Investidor é sorteada.
for (let day = 4; ; day++) {
  const date = `2026-10-${String(day).padStart(2, '0')}`
  const drawn = act(state, { type: 'drawMissions', date })
  if (drawn.missions?.list.some((mission) => mission.id === 'investidor')) {
    state = drawn
    break
  }
}
// Três kitnets cumprem a Investidor, e a recompensa põe a renda em dobro.
for (let i = 0; i < 3; i++) state = act(state, { type: 'buyProperty', propertyId: 'kitnet' })
state = act(state, { type: 'claimMission', missionId: 'investidor' })
// Até a primeira prova, que abre o resultado do concurso.
state = advance(state, year).state
if (state.choices.length !== 1 || state.choices[0].type !== 'concurso') {
  throw new Error('O exemplo devia terminar com o resultado do concurso aberto')
}

mkdirSync('tests/fixtures', { recursive: true })
writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`)
console.log(`Save de exemplo gravado em ${path}`)
