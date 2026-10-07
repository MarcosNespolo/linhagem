import { describe, expect, it } from 'vitest'
import { propertyType } from '@/content/properties'
import {
  applyAction,
  emptyHomeChoice,
  familyRates,
  homeLots,
  homesInUse,
  homeUse,
  homeUseEffect,
  housingCost,
  livingCount,
  placesInUse,
  rentedPlaces,
  rentFor,
  rentPerMonth,
  type GameState,
  type HomeUse,
} from '@/engine'
import { expectClose, expectOk, makeGame, makeStart, withHomes } from '../helpers'

function setUse(
  state: GameState,
  propertyId: 'kitnet' | 'apartamento' | 'casa',
  lot: number,
  use: HomeUse,
) {
  return expectOk(applyAction(state, { type: 'setHomeUse', propertyId, lot, use })).state
}

describe('onde a família mora', () => {
  it('no automático, o casal mora no kitnet e a casa rende aluguel', () => {
    const state = withHomes(makeGame(), { kitnet: 1, casa: 1 })
    expect(state.homes).toEqual(emptyHomeChoice())
    expect(homeUse(state, 'casa', 0)).toBe('auto')
    expect(homesInUse(state)).toEqual({ kitnet: 1 })
    expect(homeLots(state, 'kitnet')).toEqual([0])
    expect(homeLots(state, 'casa')).toEqual([])
    expect(rentPerMonth(state)).toBe(propertyType('casa').rentPerMonth)
  })

  it('morar na casa leva a família para lá, e o kitnet, que sobra, passa a render', () => {
    const state = setUse(withHomes(makeGame(), { kitnet: 1, casa: 1 }), 'casa', 0, 'live')
    expect(homeUse(state, 'casa', 0)).toBe('live')
    expect(homesInUse(state)).toEqual({ casa: 1 })
    expect(homeLots(state, 'casa')).toEqual([0])
    expect(placesInUse(state)).toBe(propertyType('casa').home?.places)
    expect(rentedPlaces(state)).toBe(0)
    expect(rentPerMonth(state)).toBe(propertyType('kitnet').rentPerMonth)
    expect(housingCost(state)).toBe(propertyType('casa').billsPerMonth)
  })

  it('quem mora sempre fica, mesmo sobrando lugar, e o automático completa quando falta', () => {
    // Dois apartamentos no automático: o casal cabe em um. Com o segundo para morar, os dois ficam.
    const both = setUse(withHomes(makeGame(), { apartamento: 2 }), 'apartamento', 1, 'live')
    expect(homesInUse(both)).toEqual({ apartamento: 1 })
    expect(homeLots(both, 'apartamento')).toEqual([1])
    const forced = setUse(both, 'apartamento', 0, 'live')
    expect(homesInUse(forced)).toEqual({ apartamento: 2 })
    expect(homeLots(forced, 'apartamento')).toEqual([0, 1])
  })

  it('alugar a casa deixa o casal de aluguel, e a casa rende', () => {
    const state = withHomes(makeGame(), { casa: 1 })
    expect(rentedPlaces(state)).toBe(0)
    const rented = setUse(state, 'casa', 0, 'rent')
    expect(homesInUse(rented)).toEqual({})
    expect(rentedPlaces(rented)).toBe(livingCount(rented))
    expect(housingCost(rented)).toBe(rentFor(livingCount(rented)))
    expect(rentPerMonth(rented)).toBe(propertyType('casa').rentPerMonth)
    // Alugar a casa e pagar o aluguel do casal sai mais em conta que morar nela.
    expect(familyRates(rented).net).toBeGreaterThan(familyRates(state).net)
  })

  it('o efeito de cada uso é a diferença no saldo do mês', () => {
    const state = withHomes(makeGame(), { kitnet: 1, casa: 1 })
    for (const use of ['live', 'rent'] as const) {
      for (const [id, lot] of [
        ['casa', 0],
        ['kitnet', 0],
      ] as const) {
        const after = setUse(state, id, lot, use)
        expectClose(
          homeUseEffect(state, id, lot, use),
          familyRates(after).net - familyRates(state).net,
        )
      }
    }
    expect(homeUseEffect(state, 'kitnet', 0, 'auto')).toBe(0)
  })

  it('voltar ao automático desfaz as escolhas', () => {
    const chosen = setUse(
      setUse(withHomes(makeGame(), { kitnet: 2, casa: 1 }), 'casa', 0, 'live'),
      'kitnet',
      1,
      'rent',
    )
    expect(chosen.homes).toEqual({ live: { casa: [0] }, rent: { kitnet: [1] } })
    const back = setUse(chosen, 'casa', 0, 'auto')
    expect(back.homes).toEqual({ live: {}, rent: { kitnet: [1] } })
    const reset = expectOk(applyAction(chosen, { type: 'resetHomes' })).state
    expect(reset.homes).toEqual(emptyHomeChoice())
    expect(homesInUse(reset)).toEqual({ kitnet: 1 })
  })

  it('na casa dos pais, ninguém mora nos imóveis, nem nos escolhidos para morar', () => {
    const state = setUse(withHomes(makeStart(), { kitnet: 1 }), 'kitnet', 0, 'live')
    expect(homesInUse(state)).toEqual({})
    expect(rentedPlaces(state)).toBe(0)
    expect(rentPerMonth(state)).toBe(propertyType('kitnet').rentPerMonth)
  })

  it('só escolhe o uso das moradias que são da família', () => {
    const state = withHomes(makeGame(), { kitnet: 1, sala: 1 })
    const notOwned = applyAction(state, {
      type: 'setHomeUse',
      propertyId: 'kitnet',
      lot: 5,
      use: 'live',
    })
    expect(notOwned).toEqual({ ok: false, error: 'lotNotOwned' })
    const commercial = applyAction(state, {
      type: 'setHomeUse',
      propertyId: 'sala',
      lot: 0,
      use: 'live',
    })
    expect(commercial).toEqual({ ok: false, error: 'propertyNotFound' })
  })
})
