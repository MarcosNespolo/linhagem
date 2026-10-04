import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'

const draw = (seed: number, count: number) => {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => rng.next())
}

describe('createRng', () => {
  it('repete a mesma sequência para a mesma seed', () => {
    expect(draw(42, 10)).toEqual(draw(42, 10))
  })

  it('gera sequências diferentes para seeds diferentes', () => {
    expect(draw(1, 10)).not.toEqual(draw(2, 10))
  })

  it('continua a sequência a partir do estado salvo', () => {
    const original = createRng(7)
    original.next()
    original.next()
    const resumed = createRng(original.state)
    expect([resumed.next(), resumed.next()]).toEqual([original.next(), original.next()])
  })

  it('fica dentro dos limites e cobre todo o intervalo', () => {
    const rng = createRng(123)
    const seen = new Set<number>()
    for (let i = 0; i < 2_000; i++) {
      const value = rng.next()
      expect(value >= 0 && value < 1).toBe(true)
      seen.add(rng.int(1, 6))
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('recusa sortear de uma lista vazia', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError)
  })
})
