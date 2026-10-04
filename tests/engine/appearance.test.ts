import { describe, expect, it } from 'vitest'
import { APPEARANCE } from '@/content/appearance'
import {
  createRng,
  inheritAppearance,
  pickWeighted,
  rollAppearance,
  type Appearance,
} from '@/engine'
import { founders, lastMember, makeGame, withChild } from '../helpers'

const base: Appearance = {
  skin: 1,
  hair: 0,
  eyes: 0,
  curl: 0,
  style: 0,
  freckles: false,
  glassesFrom: null,
  beard: false,
  balding: false,
}

function inheritMany(a: Appearance, b: Appearance, count = 400): Appearance[] {
  const rng = createRng(99)
  return Array.from({ length: count }, (_, i) => inheritAppearance(rng, a, b, i % 2 ? 'f' : 'm'))
}

describe('aparência', () => {
  it('sorteia valores dentro das paletas', () => {
    const rng = createRng(5)
    for (let i = 0; i < 500; i++) {
      const look = rollAppearance(rng, i % 2 ? 'f' : 'm')
      expect(look.skin).toBeGreaterThanOrEqual(0)
      expect(look.skin).toBeLessThan(APPEARANCE.skinTones)
      expect(look.hair).toBeLessThan(APPEARANCE.hairWeights.light.length)
      expect(look.eyes).toBeLessThan(APPEARANCE.eyeWeights.light.length)
      expect(look.curl).toBeLessThan(APPEARANCE.curlWeights.light.length)
    }
  })

  it('só dá barba e calvície para homens', () => {
    const rng = createRng(6)
    for (let i = 0; i < 300; i++) {
      const look = rollAppearance(rng, 'f')
      expect(look.beard).toBe(false)
      expect(look.balding).toBe(false)
    }
  })

  it('o tom de pele do filho fica entre os dos pais, com no máximo um passo de diferença', () => {
    const children = inheritMany({ ...base, skin: 2 }, { ...base, skin: 5 })
    for (const child of children) {
      expect(child.skin).toBeGreaterThanOrEqual(1)
      expect(child.skin).toBeLessThanOrEqual(6)
    }
    const insideRange = children.filter((child) => child.skin >= 2 && child.skin <= 5)
    expect(insideRange.length / children.length).toBeGreaterThan(0.8)
  })

  it('a cor do cabelo e dos olhos vem quase sempre de um dos pais', () => {
    const children = inheritMany({ ...base, hair: 1, eyes: 4 }, { ...base, hair: 6, eyes: 3 })
    const hairFromParents = children.filter((child) => child.hair === 1 || child.hair === 6)
    const eyesFromParents = children.filter((child) => child.eyes === 4 || child.eyes === 3)
    expect(hairFromParents.length / children.length).toBeGreaterThan(0.85)
    expect(eyesFromParents.length / children.length).toBeGreaterThan(0.85)
  })

  it('a textura do cabelo fica entre as dos pais', () => {
    for (const child of inheritMany({ ...base, curl: 1 }, { ...base, curl: 3 })) {
      expect(child.curl).toBeGreaterThanOrEqual(1)
      expect(child.curl).toBeLessThanOrEqual(3)
    }
  })

  it('o filho nasce com a aparência herdada dos pais', () => {
    const state = withChild(makeGame(21))
    const [mother, father] = founders(state)
    const child = lastMember(state)
    const skins = [mother.appearance.skin, father.appearance.skin]
    expect(child.appearance.skin).toBeGreaterThanOrEqual(Math.min(...skins) - 1)
    expect(child.appearance.skin).toBeLessThanOrEqual(Math.max(...skins) + 1)
  })

  it('pickWeighted respeita os pesos e nunca escolhe peso zero', () => {
    const rng = createRng(8)
    const counts = [0, 0, 0]
    for (let i = 0; i < 3_000; i++) counts[pickWeighted(rng, [1, 0, 3])] += 1
    expect(counts[1]).toBe(0)
    expect(counts[2]).toBeGreaterThan(counts[0] * 2)
    expect(() => pickWeighted(rng, [0, 0])).toThrow(RangeError)
  })
})
