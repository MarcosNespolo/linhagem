import { BALANCE } from '@/content/balance'
import { hashString, type Appearance, type Gender } from '@/engine'
import { BACKGROUNDS, EYES, GLASSES, HAIR, SHIRTS, SILVER, SKIN, mixColor, shade } from './palette'

export type Stage = 'baby' | 'child' | 'teen' | 'adult' | 'elder'

export type HairCut =
  | 'tuft'
  | 'short'
  | 'sidePart'
  | 'buzz'
  | 'curlyShort'
  | 'afro'
  | 'long'
  | 'bob'
  | 'bun'
  | 'ponytail'
  | 'pigtails'
  | 'curlyLong'

/** Tudo o que o desenho precisa, já resolvido para a idade atual. */
export type AvatarLook = {
  stage: Stage
  gender: Gender
  skin: string
  skinShade: string
  hair: string
  brow: string
  eyes: string
  cut: HairCut
  /** 0 cabelo cheio, 1 rareando, 2 só nas laterais. */
  balding: 0 | 1 | 2
  beard: boolean
  glasses: string | null
  freckles: boolean
  /** 0 nenhuma, 1 pés de galinha, 2 também na testa. */
  wrinkles: 0 | 1 | 2
  blush: number
  background: string
  shirt: string
}

const CHILDHOOD_END = 13

export function stageForAge(age: number): Stage {
  if (age < 3) return 'baby'
  if (age < CHILDHOOD_END) return 'child'
  if (age < BALANCE.adultAge) return 'teen'
  if (age < BALANCE.retirementAge) return 'adult'
  return 'elder'
}

/** Quanto do cabelo já ficou branco, de 0 a 1. */
function grayAmount(age: number): number {
  if (age < 45) return 0
  if (age < 55) return 0.25
  if (age < 65) return 0.5
  if (age < 75) return 0.75
  return 0.92
}

function pickBy<T>(options: readonly T[], style: number): T {
  return options[style % options.length]
}

function chooseCut(appearance: Appearance, gender: Gender, stage: Stage): HairCut {
  const { curl, style } = appearance
  if (stage === 'baby') return 'tuft'
  if (gender === 'm') {
    if (stage === 'child') return curl >= 2 ? 'curlyShort' : pickBy(['short', 'sidePart'], style)
    if (curl === 3) return pickBy(['afro', 'curlyShort', 'buzz'], style)
    if (curl === 2) return pickBy(['curlyShort', 'short', 'buzz'], style)
    return pickBy(['short', 'sidePart', 'buzz'], style)
  }
  if (stage === 'child') {
    return curl >= 2
      ? pickBy(['curlyLong', 'pigtails'], style)
      : pickBy(['pigtails', 'bob', 'long', 'ponytail'], style)
  }
  const cut: HairCut =
    curl === 3
      ? pickBy(['curlyLong', 'afro', 'bun'], style)
      : curl === 2
        ? pickBy(['curlyLong', 'bob', 'bun'], style)
        : pickBy(['long', 'bob', 'bun', 'ponytail'], style)
  if (stage === 'elder' && cut === 'long') return 'bob'
  if (stage === 'elder' && cut === 'ponytail') return 'bun'
  return cut
}

export function avatarLook(
  appearance: Appearance,
  gender: Gender,
  age: number,
  avatarSeed: string,
): AvatarLook {
  const stage = stageForAge(age)
  const seed = hashString(avatarSeed)
  const baseHair = HAIR[appearance.hair] ?? HAIR[0]
  const hair = mixColor(baseHair, SILVER, grayAmount(age))
  const isLightHair = appearance.hair >= 6
  const skin = SKIN[appearance.skin] ?? SKIN[0]
  const balding =
    gender === 'm' && appearance.balding && stage !== 'baby'
      ? age >= 55
        ? 2
        : age >= 40
          ? 1
          : 0
      : 0
  const readingGlasses = age >= 60 && seed % 3 === 0
  const wearsGlasses =
    (appearance.glassesFrom !== null && age >= appearance.glassesFrom) || readingGlasses
  return {
    stage,
    gender,
    skin,
    skinShade: shade(skin, 0.14),
    hair,
    brow: isLightHair ? shade(hair, 0.28) : hair,
    eyes: EYES[appearance.eyes] ?? EYES[0],
    cut: chooseCut(appearance, gender, stage),
    balding,
    beard: gender === 'm' && appearance.beard && age >= 20,
    glasses: wearsGlasses ? GLASSES[(seed >>> 3) % GLASSES.length] : null,
    freckles: appearance.freckles,
    wrinkles: age >= 70 ? 2 : age >= 55 ? 1 : 0,
    blush: blushFor(stage, gender),
    background: BACKGROUNDS[seed % BACKGROUNDS.length],
    shirt: SHIRTS[(seed >>> 5) % SHIRTS.length],
  }
}

function blushFor(stage: Stage, gender: Gender): number {
  if (stage === 'baby') return 0.5
  if (stage === 'child') return 0.38
  if (stage === 'teen') return 0.24
  return gender === 'f' ? 0.2 : 0.1
}

/** Chave que muda só quando o desenho muda. Serve para memorizar o componente. */
export function lookKey(look: AvatarLook): string {
  return [
    look.stage,
    look.gender,
    look.skin,
    look.hair,
    look.eyes,
    look.cut,
    look.balding,
    look.beard ? 1 : 0,
    look.glasses ?? '-',
    look.freckles ? 1 : 0,
    look.wrinkles,
    look.background,
    look.shirt,
  ].join('|')
}
