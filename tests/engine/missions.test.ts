import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { missionInfo, type MissionId } from '@/content/missions'
import {
  advance,
  applyAction,
  boostTicksLeft,
  claimableMissions,
  clockPosition,
  deserialize,
  familyRates,
  isBoosted,
  serialize,
  TICKS_PER_DAY,
  type GameState,
  type MissionState,
} from '@/engine'
import {
  days,
  expectOk,
  expectSameState,
  founders,
  makeGame,
  lastMember,
  marryMember,
  play,
  untilParentAge,
  withHomes,
  withMoney,
  years,
} from '../helpers'

const DATE = '2026-10-04'
const YEAR_TICKS = BALANCE.daysPerYear * TICKS_PER_DAY

function draw(state: GameState, date = DATE): GameState {
  return expectOk(applyAction(state, { type: 'drawMissions', date })).state
}

function mission(state: GameState, id: MissionId): MissionState {
  const found = state.missions?.list.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`A missão ${id} não foi sorteada`)
  return found
}

/** Estado com uma missão já cumprida, para pegar a recompensa. */
function withDoneMission(state: GameState, id: MissionId): GameState {
  const { goal } = missionInfo(id)
  const done: MissionState = { id, goal, progress: goal, base: 0, claimed: false }
  const list = state.missions?.list.filter((other) => other.id !== id) ?? []
  return { ...state, missions: { date: DATE, list: [...list, done] } }
}

describe('missões do dia', () => {
  it('o mesmo dia dá as mesmas missões em dois aparelhos, sem mexer no sorteio do jogo', () => {
    const state = withMoney(makeGame(31), 1e6)
    const other = deserialize(serialize(state))
    const first = draw(state)
    expect(draw(other).missions).toEqual(first.missions)
    expect(first.rngState).toBe(state.rngState)

    const orders = new Set<string>()
    for (let day = 1; day <= 10; day++) {
      const date = `2026-10-${String(day).padStart(2, '0')}`
      orders.add(
        draw(state, date)
          .missions!.list.map((item) => item.id)
          .join(','),
      )
    }
    expect(orders.size).toBeGreaterThan(1)
  })

  it('são três, de tipos diferentes, e só as que a família consegue cumprir', () => {
    const state = makeGame(32)
    for (let day = 1; day <= 10; day++) {
      const drawn = draw(state, `2026-11-${String(day).padStart(2, '0')}`).missions!.list
      expect(drawn).toHaveLength(BALANCE.missions.perDay)
      // Só o casal fundador: dá para ter filhos, encher a casa e juntar dinheiro.
      expect(drawn.map((item) => item.id).sort()).toEqual(['casaCheia', 'chaDeBebe', 'peDeMeia'])
    }
    const owner = expectOk(
      applyAction(withMoney(state, 1e6), { type: 'buyProperty', propertyId: 'kitnet' }),
    ).state
    const seen = new Set<string>()
    for (let day = 1; day <= 20; day++) {
      const date = `2026-12-${String(day).padStart(2, '0')}`
      for (const item of draw(owner, date).missions!.list) seen.add(item.id)
    }
    expect(seen).toContain('investidor')
    expect(seen).not.toContain('formatura')
  })

  it('não sorteia de novo no mesmo dia nem aceita data inválida', () => {
    const state = draw(makeGame(33))
    expect(applyAction(state, { type: 'drawMissions', date: DATE })).toEqual({
      ok: false,
      error: 'alreadyDrawn',
    })
    expect(applyAction(state, { type: 'drawMissions', date: 'amanhã' })).toEqual({
      ok: false,
      error: 'invalidDate',
    })
    // No dia seguinte, as missões e as recompensas não pegas dão lugar às novas.
    const next = withDoneMission(state, 'chaDeBebe')
    const tomorrow = draw(next, '2026-10-05')
    expect(tomorrow.missions!.date).toBe('2026-10-05')
    expect(claimableMissions(tomorrow)).toEqual([])
  })

  it('conta só o que acontece depois que aparecem e paga meses de renda', () => {
    let state = withHomes(withMoney(makeGame(34), 1e7), { kitnet: 1 })
    const [mother] = founders(state)
    state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
    state = draw(state)
    expect(mission(state, 'chaDeBebe').progress).toBe(0)

    for (let i = 0; i < 2; i++) {
      // O relógio para nas matrículas de janeiro; play responde com a sugestão e segue.
      state = play(state, days(BALANCE.children.cooldownDays))
      state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
    }
    expect(mission(state, 'chaDeBebe').progress).toBe(2)
    expect(claimableMissions(state).map((item) => item.id)).toContain('chaDeBebe')

    expect(familyRates(state).net).toBeGreaterThan(0)
    const reward = 6 * familyRates(state).net
    const claimed = expectOk(applyAction(state, { type: 'claimMission', missionId: 'chaDeBebe' }))
    expect(claimed.state.money).toBeCloseTo(state.money + reward)
    expect(mission(claimed.state, 'chaDeBebe').claimed).toBe(true)
    expect(applyAction(claimed.state, { type: 'claimMission', missionId: 'chaDeBebe' })).toEqual({
      ok: false,
      error: 'alreadyClaimed',
    })
  })

  it('não paga missão que não chegou à meta', () => {
    const state = draw(makeGame(35))
    expect(applyAction(state, { type: 'claimMission', missionId: 'chaDeBebe' })).toEqual({
      ok: false,
      error: 'missionNotDone',
    })
    expect(applyAction(state, { type: 'claimMission', missionId: 'formatura' })).toEqual({
      ok: false,
      error: 'missionNotFound',
    })
  })

  it('Pé-de-meia: juntar, depois do sorteio, dois anos da renda daquele dia', () => {
    const state = draw(makeGame(36))
    const piggy = mission(state, 'peDeMeia')
    expect(piggy.base).toBe(state.money)
    expect(piggy.goal).toBe(Math.round(24 * familyRates(state).net))
    const later = advance(state, years(3)).state
    expect(mission(later, 'peDeMeia').progress).toBe(piggy.goal)
  })

  it('Casa cheia: três pessoas vivas a mais que no sorteio', () => {
    // Dois filhos adultos: os dois casam e um dos casais tem um bebê.
    let state = withHomes(withMoney(makeGame(37), 1e9), { kitnet: 2 })
    const [mother] = founders(state)
    const children: string[] = []
    for (let i = 0; i < 2; i++) {
      state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
      children.push(lastMember(state).id)
      state = play(state, days(BALANCE.children.cooldownDays))
    }
    state = draw(play(state, years(BALANCE.adultAge)))
    const full = mission(state, 'casaCheia')
    expect(full.base).toBe(Object.values(state.members).filter((m) => m.deathDay === null).length)
    for (const childId of children) state = marryMember(state, childId)
    state = untilParentAge(state)
    state = expectOk(applyAction(state, { type: 'haveChild', parentId: children[0] })).state
    expect(mission(state, 'casaCheia').progress).toBe(3)
  })
})

describe('renda em dobro', () => {
  it('dobra a renda por 5 anos do jogo, e outro bônus soma 5 anos ao que falta', () => {
    const state = withDoneMission(draw(makeGame(38)), 'investidor')
    const before = familyRates(state)
    const boosted = expectOk(
      applyAction(state, { type: 'claimMission', missionId: 'investidor' }),
    ).state
    expect(isBoosted(boosted)).toBe(true)
    expect(boostTicksLeft(boosted)).toBe(5 * YEAR_TICKS)
    expect(familyRates(boosted).income).toBe(2 * before.income)
    expect(familyRates(boosted).expense).toBe(before.expense)

    const again = expectOk(
      applyAction(withDoneMission(boosted, 'aprovado'), {
        type: 'claimMission',
        missionId: 'aprovado',
      }),
    ).state
    expect(boostTicksLeft(again)).toBe(10 * YEAR_TICKS)
  })

  it('acaba na hora certa, e de uma vez ou aos poucos dá o mesmo resultado', () => {
    // Pega o bônus no meio de um dia, para o fim cair no meio de outro.
    const start = advance(draw(makeGame(39)), days(10.5)).state
    const claimed = expectOk(
      applyAction(withDoneMission(start, 'aprovado'), {
        type: 'claimMission',
        missionId: 'aprovado',
      }),
    ).state
    const end = clockPosition(claimed) + 5 * YEAR_TICKS
    expect(claimed.clock.tickOfDay).toBeGreaterThan(0)

    const total = years(6)
    const atOnce = advance(claimed, total).state
    let stepwise = claimed
    for (let elapsed = 0; elapsed < total; elapsed += 1_000) {
      stepwise = advance(stepwise, 1_000).state
    }
    expect(isBoosted(atOnce)).toBe(false)
    expect(atOnce.boosts.incomeUntil).toBe(end)
    expectSameState(atOnce, stepwise)

    const justBefore = advance(claimed, years(5) - 1).state
    expect(isBoosted(justBefore)).toBe(true)
  })

  it('o save da versão 7 começa sem missões e sem bônus', () => {
    const json = readFileSync(new URL('../fixtures/save-v7.json', import.meta.url), 'utf8')
    const state = deserialize(json)
    expect(state.missions).toBeNull()
    expect(state.boosts).toEqual({ incomeUntil: 0 })
    expect(state.stats.rentEarned).toBe(0)
  })
})
