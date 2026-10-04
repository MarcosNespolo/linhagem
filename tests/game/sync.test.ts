import { describe, expect, it } from 'vitest'
import { freshMeta, nextStep, parseSyncMeta, type SyncMeta } from '@/game/sync'

const family = { seed: 7 }
const synced: SyncMeta = { userId: 'u1', revision: 3, familySeed: 7, dirty: false, replace: false }

describe('nextStep', () => {
  it('envia a família quando a nuvem está vazia', () => {
    expect(nextStep(family, freshMeta('u1'), null)).toBe('create')
    expect(nextStep(null, freshMeta('u1'), null)).toBe('none')
  })

  it('adota a família da nuvem quando o aparelho ainda não tem uma', () => {
    expect(nextStep(null, freshMeta('u1'), 5)).toBe('adopt')
  })

  it('pergunta na primeira sincronização de um aparelho que já tem família', () => {
    expect(nextStep(family, freshMeta('u1'), 1)).toBe('ask')
  })

  it('não faz nada quando os dois lados estão iguais', () => {
    expect(nextStep(family, synced, 3)).toBe('none')
  })

  it('envia o que o jogador mudou quando a nuvem não mudou', () => {
    expect(nextStep(family, { ...synced, dirty: true }, 3)).toBe('update')
  })

  it('adota o que outro aparelho gravou quando aqui nada mudou', () => {
    expect(nextStep(family, synced, 4)).toBe('adopt')
  })

  it('pergunta quando este aparelho e a nuvem mudaram', () => {
    expect(nextStep(family, { ...synced, dirty: true }, 4)).toBe('ask')
  })

  it('pergunta quando a família deste aparelho começou sem a conta conectada', () => {
    expect(nextStep({ seed: 8 }, { ...synced, dirty: true }, 3)).toBe('ask')
  })

  it('substitui a nuvem quando a família nova começou com a conta conectada', () => {
    const meta = { ...synced, dirty: true, replace: true }
    expect(nextStep({ seed: 8 }, meta, 4)).toBe('replace')
    expect(nextStep({ seed: 8 }, meta, null)).toBe('create')
  })
})

describe('parseSyncMeta', () => {
  it('lê o que foi gravado', () => {
    expect(parseSyncMeta(JSON.stringify(synced))).toEqual(synced)
    expect(parseSyncMeta(JSON.stringify(freshMeta('u2')))).toEqual(freshMeta('u2'))
  })

  it('ignora o que não dá para usar', () => {
    expect(parseSyncMeta(null)).toBeNull()
    expect(parseSyncMeta('{')).toBeNull()
    expect(parseSyncMeta(JSON.stringify({ ...synced, revision: 'x' }))).toBeNull()
    expect(parseSyncMeta(JSON.stringify({ userId: 'u1' }))).toBeNull()
  })
})
