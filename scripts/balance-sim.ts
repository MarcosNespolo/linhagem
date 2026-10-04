/**
 * Simula minutos de jogo com uma estratégia simples e imprime a evolução da
 * família, para ajustar src/content/balance.ts olhando números em vez de
 * jogar por horas.
 *
 * Estratégia: as escolhas ficam com a sugestão (a escola, o caminho depois do
 * médio e a vaga de maior salário), a família paga os cursos de promoção que
 * cabem no dinheiro, quem é adulto casa assim que dá (com a pessoa de maior
 * salário entre as sugeridas), todo casal tem filho sempre que pode, até o
 * limite de filhos por casal, e o que sobra além do próximo casamento vai para
 * o imóvel que se paga mais rápido. As escolhas são respondidas na hora, então
 * o relógio quase não fica parado.
 *
 * Uso: npm run sim -- --minutos 120 --seed 7 --filhos 4
 */
import { parseArgs } from 'node:util'
import { BALANCE } from '../src/content/balance'
import { careerLevel } from '../src/content/careers'
import {
  advance,
  applyAction,
  checkHaveChild,
  checkSeekPartner,
  childrenOf,
  familyRates,
  isPropertyUnlocked,
  livingMembers,
  msToTicks,
  newGame,
  paybackYears,
  propertyPrice,
  rentPerMonth,
  suggestedPicks,
  totalProperties,
  visiblePropertyTypes,
  TICKS_PER_DAY,
  TICKS_PER_MS,
  weddingCost,
  type GameState,
} from '../src/engine'
import { formatMoney, formatRate } from '../src/lib/format'

const { values } = parseArgs({
  options: {
    minutos: { type: 'string', default: '120' },
    seed: { type: 'string', default: '1' },
    filhos: { type: 'string', default: '4' },
  },
})
const minutes = Number(values.minutos)
const seed = Number(values.seed)
const maxChildren = Number(values.filhos)
if (!Number.isFinite(minutes) || minutes <= 0) {
  throw new Error('Use --minutos com um número positivo')
}

/** Milissegundos reais entre uma decisão e outra da estratégia. */
const STEP_MS = 1_000
/** De quanto em quanto tempo real a tabela ganha uma linha. */
const ROW_EVERY_MS = 5 * 60_000

let state: GameState = newGame({ seed, now: 0, startDate: '2026-01-01' })
let births = 0
let weddings = 0
let deaths = 0
let courses = 0
const rows: Record<string, string | number>[] = []

const snapshot = (elapsedMs: number) => {
  rows.push({
    minuto: elapsedMs / 60_000,
    ano: Math.floor(state.clock.day / BALANCE.daysPerYear),
    dinheiro: formatMoney(state.money),
    taxa: formatRate(familyRates(state).net),
    vivos: livingMembers(state).length,
    total: Object.keys(state.members).length,
    casamentos: weddings,
    nascimentos: births,
    mortes: deaths,
    cursos: courses,
    imóveis: totalProperties(state),
    aluguel: formatRate(rentPerMonth(state)),
    'próx. casamento': formatMoney(weddingCost(state)),
  })
}

/** Posição do relógio em milissegundos reais desde o dia 0, sem arredondar. */
function clockMs(game: GameState): number {
  return (game.clock.day * TICKS_PER_DAY + game.clock.tickOfDay) / TICKS_PER_MS
}

function tryAct(action: Parameters<typeof applyAction>[1]): boolean {
  const result = applyAction(state, action)
  if (result.ok) state = result.state
  return result.ok
}

snapshot(0)
for (let elapsed = STEP_MS; elapsed <= minutes * 60_000; elapsed += STEP_MS) {
  // O relógio para em cada escolha; a estratégia responde e avança o resto do passo.
  let left = STEP_MS
  while (msToTicks(left) > 0) {
    const before = clockMs(state)
    const result = advance(state, left)
    state = result.state
    deaths += result.events.filter((event) => event.type === 'died').length
    left -= clockMs(state) - before
    if (state.choices.length === 0) break
    if (!tryAct({ type: 'choose', picks: suggestedPicks(state) })) break
  }

  const paid = applyAction(state, { type: 'payAllCourses' })
  if (paid.ok) {
    state = paid.state
    courses += paid.events.length
  }

  for (const member of livingMembers(state)) {
    if (!checkSeekPartner(state, member.id).ok || state.money < weddingCost(state)) continue
    if (!tryAct({ type: 'findSuitors', memberId: member.id })) continue
    const suitors = state.suitors[member.id] ?? []
    const salary = (index: number) =>
      careerLevel(suitors[index].career.id, suitors[index].career.level).salaryPerMonth
    const best = suitors.reduce(
      (bestIndex, _suitor, index) => (salary(index) > salary(bestIndex) ? index : bestIndex),
      0,
    )
    if (tryAct({ type: 'marry', memberId: member.id, suitorIndex: best })) weddings += 1
  }

  for (const member of livingMembers(state)) {
    if (!member.partnerId || member.id > member.partnerId) continue
    if (childrenOf(state, member.id).length >= maxChildren) continue
    if (!checkHaveChild(state, member.id).ok) continue
    if (tryAct({ type: 'haveChild', parentId: member.id })) births += 1
  }
  // O que sobra além do próximo casamento vai para o imóvel que se paga mais rápido.
  for (;;) {
    const [best] = visiblePropertyTypes(state)
      .filter((type) => isPropertyUnlocked(state, type.id))
      .sort((a, b) => paybackYears(state, a.id) - paybackYears(state, b.id))
    if (!best || state.money - propertyPrice(state, best.id) < weddingCost(state)) break
    if (!tryAct({ type: 'buyProperty', propertyId: best.id })) break
  }
  if (elapsed % ROW_EVERY_MS === 0) snapshot(elapsed)
}

console.log(
  `Seed ${seed}, ${minutes} min reais, até ${maxChildren} filhos por casal (família ${state.familyName})`,
)
console.table(rows)
