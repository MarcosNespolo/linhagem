import { describe, expect, it } from 'vitest'
import { PROPERTY_IDS, PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import { applyAction, type GameState } from '@/engine'
import { BUILDINGS } from '@/ui/neighborhood/buildings'
import {
  cachedNeighborhoodLayout,
  MAP_WIDTH,
  neighborhoodLayout,
  rowLots,
  streetHeight,
  type MapLot,
  type NeighborhoodLayout,
} from '@/ui/neighborhood/layout'
import { days, expectOk, makeGame, play, withHomes, withMoney } from '../helpers'

function lotsOf(layout: NeighborhoodLayout, id: PropertyId): MapLot[] {
  return layout.rows.filter((row) => row.typeId === id).flatMap((row) => row.lots)
}

function shown(layout: NeighborhoodLayout): [PropertyId, boolean][] {
  return [...new Set(layout.rows.map((row) => row.typeId))].map((id) => [
    id,
    layout.rows.some((row) => row.typeId === id && row.locked),
  ])
}

/** A família com um de cada tipo: todos liberados. */
function everything(): GameState {
  return withHomes(makeGame(1), Object.fromEntries(PROPERTY_IDS.map((id) => [id, 1])))
}

describe('bairro da aba Imóveis', () => {
  it('no começo, mostra os kitnets à venda, cada um com seu endereço, e os apartamentos em obras', () => {
    const layout = neighborhoodLayout(makeGame(1))
    expect(shown(layout)).toEqual([
      ['kitnet', false],
      ['apartamento', true],
    ])
    const kitnets = lotsOf(layout, 'kitnet')
    expect(kitnets.map((lot) => lot.lot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(kitnets.every((lot) => lot.state === 'forSale')).toBe(true)
    expect(kitnets[0].address).toBe('Rua dos Ipês, 10')
    expect(kitnets[6].address).toBe('Rua das Acácias, 30')
    expect(new Set(kitnets.map((lot) => lot.address)).size).toBe(10)
    expect(lotsOf(layout, 'apartamento').every((lot) => lot.state === 'locked')).toBe(true)
  })

  it('marca onde a família mora e os alugados', () => {
    // Os dois fundadores cabem num kitnet: os outros dois rendem aluguel.
    const layout = neighborhoodLayout(withHomes(makeGame(1), { kitnet: 3 }))
    const kitnets = lotsOf(layout, 'kitnet')
    expect(kitnets.slice(0, 4).map((lot) => lot.state)).toEqual([
      'home',
      'rented',
      'rented',
      'forSale',
    ])
    expect(shown(layout)).toEqual([
      ['kitnet', false],
      ['apartamento', false],
      ['casa', true],
    ])
  })

  it('o lote comprado é exatamente o que a família escolheu', () => {
    const state = withMoney(makeGame(1), 1_000_000)
    const bought = expectOk(
      applyAction(state, { type: 'buyProperty', propertyId: 'kitnet', lot: 7 }),
    ).state
    const kitnets = lotsOf(neighborhoodLayout(bought), 'kitnet')
    expect(kitnets[7].state).toBe('home')
    expect(kitnets.filter((lot) => lot.state === 'forSale')).toHaveLength(9)
  })

  it('sem nenhum à venda, nenhum lote fica com placa', () => {
    const layout = neighborhoodLayout(withHomes(makeGame(1), { kitnet: 10 }))
    expect(lotsOf(layout, 'kitnet').some((lot) => lot.state === 'forSale')).toBe(false)
  })

  it('nos comerciais, os anúncios ocupam os primeiros lotes livres, e o total aparece quando não cabe', () => {
    const base = everything()
    const state: GameState = {
      ...base,
      properties: { ...base.properties, sala: 7 },
      lots: { ...base.lots, sala: [0, 2, 3, 4] },
      market: { ...base.market, sala: 1 },
    }
    const salas = lotsOf(neighborhoodLayout(state), 'sala')
    expect(salas.map((lot) => lot.state)).toEqual([
      'rented',
      'forSale',
      'rented',
      'rented',
      'rented',
    ])
    expect(salas.map((lot) => lot.count)).toEqual([7, undefined, undefined, undefined, undefined])

    const few = lotsOf(
      neighborhoodLayout({
        ...state,
        properties: { ...state.properties, sala: 2 },
        lots: { ...state.lots, sala: [1, 3] },
        market: { ...state.market, sala: 2 },
      }),
      'sala',
    )
    expect(few.map((lot) => lot.state)).toEqual([
      'forSale',
      'rented',
      'forSale',
      'rented',
      'neighbor',
    ])
    expect(few.every((lot) => lot.count === undefined)).toBe(true)
  })

  it('cada tipo tem nas ruas os lotes que a engine conta', () => {
    for (const type of PROPERTY_TYPES) expect(rowLots(type.id)).toBe(type.lots)
  })

  it('com tudo liberado, mostra todos os tipos e nada em obras', () => {
    const layout = neighborhoodLayout(everything())
    expect(shown(layout)).toEqual(PROPERTY_IDS.map((id) => [id, false]))
  })

  it('todo prédio cabe na faixa dele, com lugar para quase todo o alfinete', () => {
    const layout = neighborhoodLayout(everything())
    for (const row of layout.rows) {
      for (const lot of row.lots) {
        expect(BUILDINGS[lot.typeId].top(lot.variant) + 12).toBeLessThanOrEqual(row.base - row.top)
        expect(lot.x).toBeGreaterThan(0)
        expect(lot.x).toBeLessThan(MAP_WIDTH)
      }
    }
  })

  it('as fileiras e as ruas vêm uma embaixo da outra', () => {
    for (const state of [makeGame(1), everything()]) {
      const layout = neighborhoodLayout(state)
      layout.rows.forEach((row, index) => {
        expect(row.street.y).toBe(row.base)
        const next = layout.rows[index + 1]
        const end = row.base + streetHeight(row.street.kind)
        if (next) expect(next.top).toBe(end)
        else expect(layout.height).toBeGreaterThan(end)
      })
      const keys = layout.rows.flatMap((row) => row.lots.map((lot) => lot.key))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('o desenho guardado só muda quando o bairro muda', () => {
    const state = withMoney(makeGame(1), 1_000_000)
    const layout = cachedNeighborhoodLayout(state)
    expect(cachedNeighborhoodLayout(play(state, days(10)))).toBe(layout)
    const bought = expectOk(applyAction(state, { type: 'buyProperty', propertyId: 'kitnet' })).state
    const after = cachedNeighborhoodLayout(bought)
    expect(after).not.toBe(layout)
    expect(lotsOf(after, 'kitnet')[0].state).toBe('home')
  })
})
