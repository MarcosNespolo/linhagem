import { BALANCE } from '../content/balance'
import { PUBLIC_CAREER } from '../content/careers'
import { hasCar } from './economy'
import { ageOf } from './members'
import { hashUnit } from './rng'
import type { GameEvent, GameState, Member, MishapKind } from './types'

/** Sorteios de cada pessoa por dia: o do imprevisto e os de quanto ele dura ou custa. */
const ROLL = { day: 1, layoffMonths: 2, cost: 3 }

const { layoff, surgery, car } = BALANCE.mishaps
const perDay = (perYear: number) => perYear / BALANCE.daysPerYear

/** Chance de cada imprevisto por dia. */
const CHANCE = {
  layoff: perDay(layoff.perYear),
  surgery: perDay(surgery.perYear),
  seniorSurgery: perDay(surgery.seniorPerYear),
  car: perDay(car.perYear),
}

/** Acima deste sorteio, nenhum imprevisto acontece, para ninguém. */
const ANY = CHANCE.layoff + Math.max(CHANCE.surgery, CHANCE.seniorSurgery) + CHANCE.car

/**
 * Sorteio de um imprevisto: depende só da seed, do dia, da pessoa e do tipo,
 * então não gasta o gerador do jogo e dá o mesmo resultado avançando de uma vez
 * ou aos poucos.
 */
function roll(state: GameState, member: Member, kind: number): number {
  return hashUnit(state.seed, state.clock.day, Number(member.id.slice(1)), kind)
}

/** Valor sorteado entre `min` e `max`, arredondado a centenas de reais. */
function amount(value: number, { min, max }: { min: number; max: number }): number {
  return Math.round((min + value * (max - min)) / 100) * 100
}

/**
 * Imprevistos do dia, para quem está vivo em `living`: quem foi demitido e
 * já achou outro emprego volta a trabalhar, no mesmo nível e sem contar o tempo
 * parado para a promoção; quem trabalha fora do serviço público pode ser
 * demitido; adultos podem precisar de cirurgia, mais os
 * idosos; quem tem carro pode precisar de conserto. Cada pessoa tem um sorteio
 * por dia, que cai na faixa de no máximo um imprevisto: primeiro a demissão,
 * para quem pode ser demitido, depois a cirurgia e o conserto do carro. Altera
 * o rascunho e devolve true quando a renda mudou.
 */
export function processMishaps(
  draft: GameState,
  events: GameEvent[],
  living: readonly Member[],
): boolean {
  const day = draft.clock.day
  let changed = false

  for (const member of living) {
    if (member.deathDay !== null) continue

    if (member.unemployedUntil !== null && day >= member.unemployedUntil) {
      member.unemployedUntil = null
      events.push({ type: 'rehired', day, memberId: member.id })
      changed = true
    }

    const value = roll(draft, member, ROLL.day)
    // Quase todo dia, o sorteio fica acima de todas as chances e nada acontece.
    if (value >= ANY) continue
    const age = ageOf(member, day)
    if (age < BALANCE.adultAge) continue

    const career = member.career
    const canLoseJob =
      career !== null &&
      career.id !== PUBLIC_CAREER &&
      member.unemployedUntil === null &&
      age < BALANCE.retirementAge
    if (canLoseJob && value < CHANCE.layoff) {
      const { min, max } = layoff.months
      const months = min + Math.floor(roll(draft, member, ROLL.layoffMonths) * (max - min + 1))
      const until = day + Math.round((months * BALANCE.daysPerYear) / 12)
      member.unemployedUntil = until
      // O tempo sem emprego não conta para a promoção: a contagem no nível para até a volta.
      career.levelSince += until - day
      events.push({ type: 'laidOff', day, memberId: member.id, until })
      changed = true
      continue
    }
    const surgeryFrom = canLoseJob ? CHANCE.layoff : 0
    const carFrom =
      surgeryFrom + (age >= BALANCE.living.seniorAge ? CHANCE.seniorSurgery : CHANCE.surgery)
    if (value >= surgeryFrom && value < carFrom) {
      pay(draft, events, member, 'surgery', amount(roll(draft, member, ROLL.cost), surgery.cost))
    } else if (value >= carFrom && value < carFrom + CHANCE.car && hasCar(member, day)) {
      pay(draft, events, member, 'car', amount(roll(draft, member, ROLL.cost), car.cost))
    }
  }
  return changed
}

/** A família paga o imprevisto com o que tem; o que não cabe no caixa fica para o SUS e os amigos. */
function pay(
  draft: GameState,
  events: GameEvent[],
  member: Member,
  kind: MishapKind,
  cost: number,
): void {
  const paid = Math.min(cost, Math.max(0, draft.money))
  draft.money -= paid
  draft.stats.totalSpent += paid
  events.push({ type: 'mishap', day: draft.clock.day, memberId: member.id, kind, cost: paid })
}
