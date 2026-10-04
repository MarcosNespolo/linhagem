import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  applyAction,
  checkHaveChild,
  childCooldownDaysLeft,
  childCost,
  FAMILY_NAME_MAX_LENGTH,
  type GameState,
} from '@/engine'
import {
  days,
  expectOk,
  founders,
  lastMember,
  makeGame,
  setMember,
  withChild,
  withMoney,
  years,
} from '../helpers'

const haveChild = (state: GameState) =>
  applyAction(state, { type: 'haveChild', parentId: founders(state)[0].id })

describe('ter filho', () => {
  it('cria o filho, cobra o custo e marca o intervalo nos dois', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const [first, second] = founders(start)
    const cost = childCost(start, first.id, second.id)

    const result = expectOk(haveChild(start))
    const child = lastMember(result.state)
    expect(child.parentIds).toEqual([first.id, second.id])
    expect(child.generation).toBe(1)
    expect(child.birthDay).toBe(start.clock.day)
    expect(child.career).toBeNull()
    expect(result.state.money).toBe(start.money - cost)
    expect(result.state.stats.totalSpent).toBe(start.stats.totalSpent + cost)
    expect(result.state.members[first.id].lastChildDay).toBe(start.clock.day)
    expect(result.state.members[second.id].lastChildDay).toBe(start.clock.day)
    expect(result.events).toEqual([{ type: 'born', day: start.clock.day, memberId: child.id }])
  })

  it('cobra mais a cada filho do casal', () => {
    let state = withMoney(makeGame(2), 1_000_000)
    const [first, second] = founders(state)
    const costs: number[] = []
    for (let i = 0; i < 3; i++) {
      costs.push(childCost(state, first.id, second.id))
      state = expectOk(haveChild(state)).state
      state = advance(state, days(BALANCE.children.cooldownDays)).state
    }
    const { baseCost, coupleGrowth } = BALANCE.children
    const factor = (living: number) => BALANCE.familySizeGrowth ** living
    expect(costs[0]).toBe(Math.round(baseCost * factor(2)))
    expect(costs[1]).toBe(Math.round(baseCost * coupleGrowth * factor(3)))
    expect(costs[2]).toBe(Math.round(baseCost * coupleGrowth ** 2 * factor(4)))
  })

  it('fica mais caro quando a família viva cresce e volta a baratear quando ela diminui', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const [first, second] = founders(start)
    const bigger = expectOk(haveChild(start)).state
    const child = lastMember(bigger)
    const withoutParentLink = setMember(bigger, child.id, { parentIds: [] })
    expect(childCost(withoutParentLink, first.id, second.id)).toBeGreaterThan(
      childCost(start, first.id, second.id),
    )
    const smaller = setMember(withoutParentLink, child.id, { deathDay: bigger.clock.day })
    expect(childCost(smaller, first.id, second.id)).toBe(childCost(start, first.id, second.id))
  })

  it('respeita o intervalo entre filhos', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const afterFirst = expectOk(haveChild(start)).state
    const parentId = founders(afterFirst)[0].id
    expect(haveChild(afterFirst)).toEqual({ ok: false, error: 'cooldown' })
    expect(childCooldownDaysLeft(afterFirst, parentId)).toBe(BALANCE.children.cooldownDays)

    const almost = advance(afterFirst, days(BALANCE.children.cooldownDays - 1)).state
    expect(childCooldownDaysLeft(almost, parentId)).toBe(1)
    expect(haveChild(almost).ok).toBe(false)

    const ready = advance(almost, days(1)).state
    expect(childCooldownDaysLeft(ready, parentId)).toBe(0)
    expect(haveChild(ready).ok).toBe(true)
  })

  it('exige dinheiro suficiente', () => {
    const start = makeGame(2)
    const [first, second] = founders(start)
    const short = withMoney(start, childCost(start, first.id, second.id) - 1)
    expect(haveChild(short)).toEqual({ ok: false, error: 'notEnoughMoney' })
  })

  it('exige um par vivo', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const [first, second] = founders(start)
    const single = setMember(start, first.id, { partnerId: null })
    expect(haveChild(single)).toEqual({ ok: false, error: 'noPartner' })
    const widowed = setMember(start, second.id, { deathDay: 0 })
    expect(haveChild(widowed)).toEqual({ ok: false, error: 'noPartner' })
  })

  it('respeita a faixa de idade dos dois', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const [, second] = founders(start)
    const tooOld = setMember(start, second.id, {
      birthDay: -(BALANCE.children.maxParentAge + 1) * BALANCE.daysPerYear,
    })
    expect(haveChild(tooOld)).toEqual({ ok: false, error: 'tooOld' })
    const tooYoung = setMember(start, second.id, {
      birthDay: -(BALANCE.children.minParentAge - 1) * BALANCE.daysPerYear,
    })
    expect(haveChild(tooYoung)).toEqual({ ok: false, error: 'tooYoung' })
  })

  it('não repete nomes entre irmãos', () => {
    let state = withMoney(makeGame(12), 10_000_000)
    for (let i = 0; i < 6; i++) {
      state = expectOk(haveChild(state)).state
      state = advance(state, days(BALANCE.children.cooldownDays)).state
    }
    const names = Object.values(state.members).map((member) => member.firstName)
    expect(new Set(names).size).toBe(names.length)
  })

  it('informa o motivo sem precisar tentar', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const check = checkHaveChild(start, founders(start)[0].id)
    expect(check.ok).toBe(true)
    expect(checkHaveChild(start, 'nao-existe')).toEqual({ ok: false, error: 'memberNotFound' })
  })

  it('não altera o estado recebido', () => {
    const start = withMoney(makeGame(2), 1_000_000)
    const copy = structuredClone(start)
    haveChild(start)
    expect(start).toEqual(copy)
  })
})

describe('outras ações', () => {
  it('pausa e retoma', () => {
    const paused = expectOk(applyAction(makeGame(), { type: 'pause' })).state
    expect(paused.clock.paused).toBe(true)
    const resumed = expectOk(applyAction(paused, { type: 'resume' })).state
    expect(resumed.clock.paused).toBe(false)
  })

  it('renomeia a família, sem espaços nas pontas', () => {
    const result = expectOk(applyAction(makeGame(), { type: 'renameFamily', name: '  Souza  ' }))
    expect(result.state.familyName).toBe('Souza')
  })

  it('recusa nome vazio ou longo demais', () => {
    const state = makeGame()
    expect(applyAction(state, { type: 'renameFamily', name: '   ' })).toEqual({
      ok: false,
      error: 'invalidName',
    })
    const long = 'x'.repeat(FAMILY_NAME_MAX_LENGTH + 1)
    expect(applyAction(state, { type: 'renameFamily', name: long }).ok).toBe(false)
  })
})

describe('escolher', () => {
  it('recusa resposta sem escolha aberta', () => {
    const state = makeGame()
    const refused = { ok: false, error: 'choiceNotFound' }
    expect(applyAction(state, { type: 'choose', picks: [] })).toEqual(refused)
    const [first] = founders(state)
    const pick = { memberId: first.id, option: 0 }
    expect(applyAction(state, { type: 'choose', picks: [pick] })).toEqual(refused)
  })

  it('recusa opção que não existe e resposta repetida para a mesma pessoa', () => {
    const born = withChild(makeGame(4))
    const memberId = lastMember(born).id
    const waiting = advance(born, years(BALANCE.adultAge + 1)).state
    const choose = (...options: number[]) =>
      applyAction(waiting, {
        type: 'choose',
        picks: options.map((option) => ({ memberId, option })),
      })
    expect(choose(9)).toEqual({ ok: false, error: 'optionNotFound' })
    expect(choose(0.5)).toEqual({ ok: false, error: 'optionNotFound' })
    expect(choose(0, 1)).toEqual({ ok: false, error: 'choiceNotFound' })
    expect(choose(1).ok).toBe(true)
  })

  it('não altera o estado recebido', () => {
    const born = withChild(makeGame(4))
    const waiting = advance(born, years(BALANCE.adultAge + 1)).state
    const copy = structuredClone(waiting)
    const memberId = waiting.choices[0].memberId
    expectOk(applyAction(waiting, { type: 'choose', picks: [{ memberId, option: 0 }] }))
    expect(waiting).toEqual(copy)
  })
})
