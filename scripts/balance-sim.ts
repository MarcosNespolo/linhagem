/**
 * Simula horas de jogo com o jogador automático e confere os limites do plano,
 * para ajustar src/content/balance.ts olhando números em vez de jogar por
 * horas. A estratégia fica em src/sim/autoplay.ts e os limites em
 * src/sim/limits.ts.
 *
 * As escolhas são respondidas na hora, então o relógio quase não fica parado,
 * e o dia das missões vira a cada hora, como quem joga uma hora por dia. Sai
 * com erro quando algum limite falha.
 *
 * Uso: npm run sim -- --minutos 600 --seed 7 --filhos 4 --linhas 20 --save /tmp/save.json
 */
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { BALANCE } from '../src/content/balance'
import {
  familyRates,
  isBoosted,
  livingMembers,
  rentedPlaces,
  rentPerMonth,
  serialize,
  totalProperties,
} from '../src/engine'
import { formatMoney, formatRate } from '../src/lib/format'
import type { Autoplay } from '../src/sim/autoplay'
import { simulate } from '../src/sim/run'

const { values } = parseArgs({
  options: {
    minutos: { type: 'string', default: '600' },
    seed: { type: 'string', default: '1' },
    filhos: { type: 'string', default: '4' },
    linhas: { type: 'string', default: '20' },
    save: { type: 'string' },
  },
})
const minutes = Number(values.minutos)
if (!Number.isFinite(minutes) || minutes <= 0) {
  throw new Error('Use --minutos com um número positivo')
}

const rows: Record<string, string | number>[] = []
const snapshot = ({ state, counters, elapsedMs }: Autoplay) => {
  rows.push({
    minuto: elapsedMs / 60_000,
    ano: Math.floor(state.clock.day / BALANCE.daysPerYear),
    dinheiro: formatMoney(state.money),
    renda: formatRate(familyRates(state).income),
    saldo: formatRate(familyRates(state).net),
    vivos: livingMembers(state).length,
    'de aluguel': rentedPlaces(state),
    total: Object.keys(state.members).length,
    casamentos: counters.weddings,
    nascimentos: counters.births,
    mortes: counters.deaths,
    cursos: counters.courses,
    imóveis: totalProperties(state),
    aluguel: formatRate(rentPerMonth(state)),
    '×2': isBoosted(state) ? 'sim' : '',
    recompensas: counters.rewards,
    vermelho: counters.debts,
    faliu: counters.bankrupt ? 'sim' : '',
  })
}

const started = performance.now()
const { play, results } = simulate({
  seed: Number(values.seed),
  maxChildren: Number(values.filhos),
  minutes,
  everyMinutes: Number(values.linhas),
  onRow: snapshot,
})
const seconds = (performance.now() - started) / 1000
if (values.save) writeFileSync(values.save, serialize(play.state))

console.log(
  `Seed ${values.seed}, ${minutes} min, até ${values.filhos} filhos por casal (família ${play.state.familyName}), em ${seconds.toFixed(0)} s`,
)
console.table(rows)
for (const result of results) {
  console.log(
    `${result.ok ? 'ok   ' : 'FALHA'} ${result.name}: ${result.value} (limite: ${result.limit})`,
  )
}
if (results.some((result) => !result.ok)) process.exitCode = 1
