/**
 * Grava um save de exemplo da versão atual em tests/fixtures/save-v<N>.json.
 *
 * Rode antes de criar uma migração nova: os testes abrem todos os saves de
 * exemplo e conferem que continuam funcionando depois da migração. Um arquivo
 * que já existe nunca é sobrescrito, porque representa os saves reais daquela
 * versão.
 *
 * O exemplo passa pelas ações principais do jogo. Quem funda a família começa
 * sozinho, com 18 anos, faz o primeiro curso, namora quem aparece e casa; o par
 * faz o curso dele. Depois vêm dois filhos, com
 * a aptidão herdada dos pais, que fizeram a escola com as matrículas sugeridas. O
 * mais velho faz Direito numa faculdade particular e namora quem conheceu, com o
 * pedido de casamento aberto no fim do exemplo. O mais novo teve professor
 * particular no médio, acabou, estudou para concurso e passou. Quem fundou a
 * família faz o curso do próximo nível no ritmo normal, e o par acabou de
 * começar o dele com dedicação. A família tem kitnets, o primeiro financiado,
 * e um apartamento, e as missões do dia sorteadas: cumpriu a Investidor, com
 * três kitnets a mais, e está com o bônus na renda. Nos anos do exemplo, a
 * família passa pelos imprevistos que a seed sorteia, e algum inquilino sai.
 * No fim, quem fundou a família muda de carreira e volta a estudar à noite,
 * com as aulas começando em janeiro, e a família escolhe onde mora: o
 * apartamento para morar e o último kitnet para alugar.
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
// Quem funda a família já pode fazer o primeiro curso, no ritmo normal.
state = act(state, { type: 'startCourse', memberId: 'm1', dedicated: false })
// Namora quem aparece e casa no pedido, com as sugestões; os filhos esperam os dois terem 20 anos.
state = play(state, 3 * year)
if (!state.members.m1?.partnerId) throw new Error('O exemplo devia casar quem fundou a família')
// O par também faz o primeiro curso: com os dois no 2º nível, o banco financia o kitnet mais tarde.
state = act(state, { type: 'startCourse', memberId: 'm2', dedicated: false })
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
// Já com 18, o mais velho pode conhecer alguém. A família financia o primeiro kitnet.
state = play(state, year)
state = act(state, { type: 'buyProperty', propertyId: 'kitnet', financed: true })
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
// Quem fundou a família começa o curso do próximo nível, no ritmo normal.
state = act(state, { type: 'startCourse', memberId: 'm1', dedicated: false })
// A família compra mais um kitnet e um apartamento para alugar.
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
// Três kitnets cumprem a Investidor, e a recompensa dá o bônus na renda.
for (let i = 0; i < 3; i++) state = act(state, { type: 'buyProperty', propertyId: 'kitnet' })
state = act(state, { type: 'claimMission', missionId: 'investidor' })
// Até a primeira prova, que abre o resultado do concurso, respondido com a sugestão.
state = play(state, year, 'concurso')
if (state.choices.length !== 1 || state.choices[0].type !== 'concurso') {
  throw new Error('O exemplo devia parar no resultado do concurso')
}
state = act(state, { type: 'choose', picks: suggestedPicks(state) })
// O exemplo termina no pedido de casamento de quem namora.
state = play(state, 5 * year, 'propose')
if (state.choices.length !== 1 || state.choices[0].type !== 'propose') {
  throw new Error('O exemplo devia terminar com o pedido de casamento aberto')
}
// Com o pedido aberto, o par de quem fundou a família começa o curso dele com dedicação.
state = act(state, { type: 'startCourse', memberId: 'm2', dedicated: true })
// Quem fundou a família recomeça numa carreira de topo mais alto e volta a estudar à noite,
// numa faculdade particular de Licenciatura: as aulas começam no janeiro seguinte.
const careers = state.members.m1?.career?.id
const other = ['transporte', 'construcao', 'comercio'].find((id) => id !== careers)
if (!other) throw new Error('O exemplo devia ter outra carreira para quem fundou a família')
state = act(state, { type: 'changeCareer', memberId: 'm1', careerId: other as 'transporte' })
state = act(state, { type: 'returnToSchool', memberId: 'm1' })
const study = state.choices.find((choice) => choice.memberId === 'm1')
if (study?.type !== 'afterSchool') throw new Error('O exemplo devia abrir a escolha do que estudar')
const teaching = study.options.findIndex(
  (option) =>
    option.path === 'faculdade' &&
    option.network === 'particular' &&
    option.degree === 'licenciatura',
)
state = act(state, { type: 'choose', picks: [{ memberId: 'm1', option: teaching }] })
if (state.members.m1?.education.school?.startsOn === undefined) {
  throw new Error('O exemplo devia ter as aulas de quem voltou a estudar começando em janeiro')
}
// A família escolhe morar no apartamento e deixar o último kitnet sempre alugado.
const kitnets = state.lots.kitnet ?? []
state = act(state, { type: 'setHomeUse', propertyId: 'apartamento', lot: 0, use: 'live' })
state = act(state, {
  type: 'setHomeUse',
  propertyId: 'kitnet',
  lot: kitnets[kitnets.length - 1],
  use: 'rent',
})

mkdirSync('tests/fixtures', { recursive: true })
writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`)
console.log(`Save de exemplo gravado em ${path}`)
