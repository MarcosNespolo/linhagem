import { APPEARANCE } from '../content/appearance'
import { pickWeighted, type Rng } from './rng'
import type { Appearance, Gender } from './types'

/** Faixa do tom de pele, usada para escolher pesos realistas de cabelo e olhos. */
type SkinBand = 'light' | 'medium' | 'dark'

function skinBand(skin: number): SkinBand {
  if (skin <= 2) return 'light'
  if (skin <= 4) return 'medium'
  return 'dark'
}

/** Aparência de quem entra no jogo sem pais na família: fundadores e cônjuges. */
export function rollAppearance(rng: Rng, gender: Gender): Appearance {
  const skin = rng.int(0, APPEARANCE.skinTones - 1)
  const band = skinBand(skin)
  return {
    skin,
    hair: pickWeighted(rng, APPEARANCE.hairWeights[band]),
    eyes: pickWeighted(rng, APPEARANCE.eyeWeights[band]),
    curl: pickWeighted(rng, APPEARANCE.curlWeights[band]),
    style: rng.int(0, 999),
    freckles: rng.chance(APPEARANCE.freckles),
    glassesFrom: rng.chance(APPEARANCE.glasses) ? rng.int(6, 60) : null,
    beard: gender === 'm' && rng.chance(APPEARANCE.beard),
    balding: gender === 'm' && rng.chance(APPEARANCE.balding),
  }
}

/**
 * Aparência de um filho. O tom de pele fica entre os dos pais, a cor do
 * cabelo e dos olhos vem de um deles (com uma chance pequena de surpresa) e a
 * textura do cabelo fica entre as deles.
 */
export function inheritAppearance(
  rng: Rng,
  a: Appearance,
  b: Appearance,
  gender: Gender,
): Appearance {
  const odds = APPEARANCE.inheritance
  const jitter = rng.chance(odds.skinJitter) ? rng.pick([-1, 1]) : 0
  const skin = clamp(
    rng.int(Math.min(a.skin, b.skin), Math.max(a.skin, b.skin)) + jitter,
    0,
    APPEARANCE.skinTones - 1,
  )
  const band = skinBand(skin)
  const hair = rng.chance(odds.hairMutation)
    ? pickWeighted(rng, APPEARANCE.hairWeights[band])
    : rng.pick([a.hair, b.hair])
  const eyes = rng.chance(odds.eyeMutation)
    ? pickWeighted(rng, APPEARANCE.eyeWeights[band])
    : rng.pick([a.eyes, b.eyes])
  const curl = rng.int(Math.min(a.curl, b.curl), Math.max(a.curl, b.curl))
  const parentFreckles = a.freckles || b.freckles
  const parentGlasses = a.glassesFrom !== null || b.glassesFrom !== null
  return {
    skin,
    hair,
    eyes,
    curl,
    style: rng.int(0, 999),
    freckles: rng.chance(parentFreckles ? odds.frecklesFromParent : odds.frecklesNew),
    glassesFrom: rng.chance(parentGlasses ? odds.glassesFromParent : odds.glassesNew)
      ? rng.int(6, 60)
      : null,
    beard: gender === 'm' && rng.chance(APPEARANCE.beard),
    balding: gender === 'm' && rng.chance(APPEARANCE.balding),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
