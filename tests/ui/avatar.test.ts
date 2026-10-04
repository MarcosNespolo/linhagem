import { describe, expect, it } from 'vitest'
import { APPEARANCE } from '@/content/appearance'
import { EYES, HAIR, SKIN } from '@/ui/avatar/palette'
import { avatarLook, stageForAge } from '@/ui/avatar/look'
import { makeGame, founders } from '../helpers'

describe('avatar', () => {
  it('as paletas têm uma cor para cada valor que a engine sorteia', () => {
    expect(SKIN).toHaveLength(APPEARANCE.skinTones)
    expect(HAIR).toHaveLength(APPEARANCE.hairWeights.light.length)
    expect(EYES).toHaveLength(APPEARANCE.eyeWeights.light.length)
  })

  it('muda de fase com a idade', () => {
    expect([0, 2, 3, 12, 13, 17, 18, 64, 65].map(stageForAge)).toEqual([
      'baby',
      'baby',
      'child',
      'child',
      'teen',
      'teen',
      'adult',
      'adult',
      'elder',
    ])
  })

  it('o cabelo fica grisalho com a idade e a barba só aparece em adultos', () => {
    const [, man] = founders(makeGame(4))
    const appearance = { ...man.appearance, hair: 0, beard: true, balding: false }
    const young = avatarLook(appearance, 'm', 30, man.avatarSeed)
    const old = avatarLook(appearance, 'm', 80, man.avatarSeed)
    const teen = avatarLook(appearance, 'm', 16, man.avatarSeed)
    expect(old.hair).not.toBe(young.hair)
    expect(young.beard).toBe(true)
    expect(teen.beard).toBe(false)
  })

  it('a calvície aparece aos poucos depois dos 40', () => {
    const [, man] = founders(makeGame(4))
    const appearance = { ...man.appearance, balding: true }
    expect(avatarLook(appearance, 'm', 30, 'x').balding).toBe(0)
    expect(avatarLook(appearance, 'm', 45, 'x').balding).toBe(1)
    expect(avatarLook(appearance, 'm', 60, 'x').balding).toBe(2)
  })
})
