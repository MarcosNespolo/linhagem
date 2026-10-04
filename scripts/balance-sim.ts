/**
 * Simula minutos de jogo com uma estratégia simples e imprime a evolução da
 * família, para ajustar src/content/balance.ts olhando números em vez de
 * jogar por horas.
 *
 * Estratégia: ter um filho sempre que der.
 * Uso: npm run sim -- --minutos 30 --seed 7
 */
import { parseArgs } from 'node:util'
import { BALANCE } from '../src/content/balance'
import {
  advance,
  applyAction,
  checkHaveChild,
  familyRates,
  livingMembers,
  newGame,
  type GameState,
} from '../src/engine'
import { formatMoney, formatRate } from '../src/lib/format'

const { values } = parseArgs({
  options: {
    minutos: { type: 'string', default: '30' },
    seed: { type: 'string', default: '1' },
  },
})
const minutes = Number(values.minutos)
const seed = Number(values.seed)
if (!Number.isFinite(minutes) || minutes <= 0) {
  throw new Error('Use --minutos com um número positivo')
}

/** Milissegundos reais entre uma decisão e outra da estratégia. */
const STEP_MS = 1_000
/** De quanto em quanto tempo real a tabela ganha uma linha. */
const ROW_EVERY_MS = 60_000

let state: GameState = newGame({ seed, now: 0, startDate: '2026-01-01' })
let births = 0
let deaths = 0
const rows: Record<string, string | number>[] = []

const snapshot = (elapsedMs: number) => {
  rows.push({
    minuto: elapsedMs / 60_000,
    ano: Math.floor(state.clock.day / BALANCE.daysPerYear),
    dinheiro: formatMoney(state.money),
    taxa: formatRate(familyRates(state).net),
    vivos: livingMembers(state).length,
    nascimentos: births,
    mortes: deaths,
  })
}

snapshot(0)
for (let elapsed = STEP_MS; elapsed <= minutes * 60_000; elapsed += STEP_MS) {
  const result = advance(state, STEP_MS)
  state = result.state
  deaths += result.events.filter((event) => event.type === 'died').length

  for (const member of livingMembers(state)) {
    if (!member.partnerId || member.id > member.partnerId) continue
    if (!checkHaveChild(state, member.id).ok) continue
    const born = applyAction(state, { type: 'haveChild', parentId: member.id })
    if (born.ok) {
      state = born.state
      births += 1
    }
  }
  if (elapsed % ROW_EVERY_MS === 0) snapshot(elapsed)
}

console.log(
  `Seed ${seed}, ${minutes} min reais, ${BALANCE.gameMonthsPerSecond} mês por segundo (família ${state.familyName})`,
)
console.table(rows)
