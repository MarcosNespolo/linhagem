/**
 * Simula minutos de jogo com uma estratégia simples e imprime a evolução da
 * família, para ajustar src/content/balance.ts olhando números em vez de
 * jogar por horas.
 *
 * Estratégia: quem fica adulto casa assim que dá (com a pessoa de maior
 * salário entre as sugeridas) e todo casal tem filho sempre que pode, até o
 * limite de filhos por casal.
 *
 * Uso: npm run sim -- --minutos 30 --seed 7 --filhos 4
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
  livingMembers,
  newGame,
  weddingCost,
  type GameState,
} from '../src/engine'
import { formatMoney, formatRate } from '../src/lib/format'

const { values } = parseArgs({
  options: {
    minutos: { type: 'string', default: '30' },
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
const ROW_EVERY_MS = 2 * 60_000

let state: GameState = newGame({ seed, now: 0, startDate: '2026-01-01' })
let births = 0
let weddings = 0
let deaths = 0
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
    'próx. casamento': formatMoney(weddingCost(state)),
  })
}

function tryAct(action: Parameters<typeof applyAction>[1]): boolean {
  const result = applyAction(state, action)
  if (result.ok) state = result.state
  return result.ok
}

snapshot(0)
for (let elapsed = STEP_MS; elapsed <= minutes * 60_000; elapsed += STEP_MS) {
  const result = advance(state, STEP_MS)
  state = result.state
  deaths += result.events.filter((event) => event.type === 'died').length

  for (const member of livingMembers(state)) {
    if (!checkSeekPartner(state, member.id).ok || state.money < weddingCost(state)) continue
    if (!tryAct({ type: 'findSuitors', memberId: member.id })) continue
    const suitors = state.suitors[member.id] ?? []
    const best = suitors.reduce(
      (bestIndex, suitor, index) =>
        careerLevel(suitor.career.id, 0).salaryPerSecond >
        careerLevel(suitors[bestIndex].career.id, 0).salaryPerSecond
          ? index
          : bestIndex,
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
  if (elapsed % ROW_EVERY_MS === 0) snapshot(elapsed)
}

console.log(
  `Seed ${seed}, ${minutes} min reais, até ${maxChildren} filhos por casal (família ${state.familyName})`,
)
console.table(rows)
