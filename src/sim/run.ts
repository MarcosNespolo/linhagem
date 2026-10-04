/**
 * Uma partida inteira do jogador automático, com as medidas dos limites. O
 * script `npm run sim` roda 10 horas; o teste de balanceamento, 1 hora.
 */
import { createAutoplay, runClock, spend, type Autoplay, type AutoplayOptions } from './autoplay'
import {
  clockCost,
  evaluate,
  measureStep,
  newMeasures,
  offlineCost,
  saveBytes,
  type FinalMeasures,
  type LimitResult,
  type Measures,
} from './limits'

/** Tempo real entre uma decisão e outra da estratégia. */
export const STEP_MS = 1_000

export type SimulationOptions = AutoplayOptions & {
  minutes: number
  /** Chamado a cada `everyMinutes` minutos de jogo, e no começo. */
  onRow?: (play: Autoplay) => void
  everyMinutes?: number
}

export type Simulation = {
  play: Autoplay
  measures: Measures
  final: FinalMeasures
  results: LimitResult[]
}

export function simulate(options: SimulationOptions): Simulation {
  const play = createAutoplay(options)
  const measures = newMeasures()
  const rowMs = (options.everyMinutes ?? 10) * 60_000
  options.onRow?.(play)
  for (let elapsed = STEP_MS; elapsed <= options.minutes * 60_000; elapsed += STEP_MS) {
    runClock(play, STEP_MS)
    measureStep(measures, play.state, play.elapsedMs, STEP_MS)
    spend(play)
    if (elapsed % rowMs === 0) options.onRow?.(play)
  }
  const final = {
    saveBytes: saveBytes(play.state),
    clockMs: clockCost(play.state),
    offlineMs: offlineCost(play.state),
  }
  return { play, measures, final, results: evaluate(measures, final) }
}
