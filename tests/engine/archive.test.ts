import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { advance, archiveMembers, calendarDate, type GameState } from '@/engine'
import { founders, makeGame, setMember, years } from '../helpers'

const CAP = BALANCE.archive.maxMembers

/** Acrescenta pessoas que já se foram, sem filhos nem par: a primeira no dia `firstDay`, as outras em seguida. */
function withGone(state: GameState, count: number, firstDay = -50_000): GameState {
  const [template] = founders(state)
  const members = { ...state.members }
  let next = state.nextMemberId
  for (let i = 0; i < count; i++) {
    const id = `m${next++}`
    members[id] = {
      ...template,
      id,
      origin: 'born',
      parentIds: [],
      partnerId: null,
      birthDay: firstDay + i - 80 * BALANCE.daysPerYear,
      deathDay: firstDay + i,
    }
  }
  return { ...state, members, nextMemberId: next }
}

/** Roda o arquivo numa cópia e devolve a cópia. */
function archived(state: GameState): GameState {
  const draft = { ...state, members: { ...state.members }, stats: { ...state.stats } }
  archiveMembers(draft)
  return draft
}

describe('arquivo da árvore', () => {
  it('até o limite, ninguém sai', () => {
    const state = withGone(makeGame(1), CAP - 2)
    expect(Object.keys(state.members)).toHaveLength(CAP)
    const after = archived(state)
    expect(Object.keys(after.members)).toHaveLength(CAP)
    expect(after.stats.archived).toBe(0)
  })

  it('passando do limite, saem primeiro os ramos que terminaram há mais tempo', () => {
    const state = withGone(makeGame(1), CAP + 8)
    const after = archived(state)
    expect(Object.keys(after.members)).toHaveLength(CAP)
    expect(after.stats.archived).toBe(10)
    // Saem as 10 primeiras pessoas acrescentadas, que morreram antes.
    const gone = Object.keys(state.members).filter((id) => !(id in after.members))
    expect(gone).toEqual(Array.from({ length: 10 }, (_, i) => `m${3 + i}`))
    for (const founder of founders(state)) expect(after.members[founder.id]).toBeDefined()
  })

  it('ficam quem tem filho na árvore, quem está vivo, quem está no histórico e o par de quem fica', () => {
    let state = withGone(makeGame(1), CAP + 20)
    // m3 é mãe de m4; m5 está vivo; m6 aparece no histórico; m7 é viúvo de m1, viva.
    state = setMember(state, 'm4', { parentIds: ['m3'] })
    state = setMember(state, 'm5', { deathDay: null })
    state = { ...state, log: [{ type: 'retired', day: 0, memberId: 'm6' }] }
    state = setMember(state, 'm7', { partnerId: 'm1' })
    // m8 e m9 são um casal que terminou: saem juntos.
    state = setMember(state, 'm8', { partnerId: 'm9' })
    state = setMember(state, 'm9', { partnerId: 'm8' })

    const after = archived(state)
    for (const id of ['m3', 'm5', 'm6', 'm7']) expect(after.members[id]).toBeDefined()
    expect(after.members.m4).toBeUndefined()
    expect(after.members.m8).toBeUndefined()
    expect(after.members.m9).toBeUndefined()
    expect(Object.keys(after.members)).toHaveLength(CAP)
  })

  it('roda uma vez por ano, em janeiro, enquanto o relógio anda', () => {
    const state = withGone(makeGame(1), CAP + 50)
    const start = calendarDate(state.startDate, 0)
    expect(start.slice(5)).not.toBe('01-01')
    const { state: after } = advance(state, years(1))
    expect(Object.keys(after.members).length).toBeLessThanOrEqual(CAP + 2)
    expect(after.stats.archived).toBeGreaterThanOrEqual(50)
    // O estado recebido continua com todo mundo.
    expect(Object.keys(state.members)).toHaveLength(CAP + 52)
  })
})
