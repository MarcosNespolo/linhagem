import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  applyAction,
  isLogEvent,
  isMemberEvent,
  LOG_LIMIT,
  type MemberEvent,
} from '@/engine'
import {
  expectOk,
  founders,
  makeGame,
  marryMember,
  withAdultChild,
  withMoney,
  years,
} from '../helpers'

describe('histórico', () => {
  it('começa vazio', () => {
    expect(makeGame().log).toEqual([])
  })

  it('guarda nascimentos, namoros, casamentos e o que acontece com o tempo, em ordem', () => {
    const { state, childId } = withAdultChild(3)
    const people = state.log.filter(isMemberEvent)
    const own = people.filter((event) => event.memberId === childId)
    expect(own.map((event) => event.type)).toEqual([
      'born',
      'schoolStarted',
      'schoolStarted',
      'schoolStarted',
      'schoolFinished',
      'enem',
      'firstJob',
      'becameAdult',
    ])
    // Enquanto o filho cresce, os fundadores, sem cursos, só passam por imprevistos e propostas.
    const others = people.filter((event) => event.memberId !== childId)
    const meanwhile = new Set(['laidOff', 'rehired', 'mishap', 'jobOffered'])
    expect(others.length).toBeGreaterThan(0)
    expect(others.every((event) => meanwhile.has(event.type))).toBe(true)

    const married = marryMember(state, childId)
    expect(married.log.slice(-2).map((event) => event.type)).toEqual(['datingStarted', 'married'])
  })

  it('o histórico do estado inclui os eventos devolvidos por advance, menos o 13º', () => {
    const { state } = withAdultChild(3)
    const result = advance(state, years(BALANCE.retirementAge))
    const added = result.state.log.slice(state.log.length)
    expect(result.events.some((event) => event.type === 'thirteenth')).toBe(true)
    expect(added).toEqual(result.events.filter(isLogEvent).slice(-added.length))
  })

  it(`guarda no máximo ${LOG_LIMIT} acontecimentos, descartando os mais antigos`, () => {
    let state = withMoney(makeGame(4), 1e12)
    const [mother] = founders(state)
    const filler: MemberEvent[] = Array.from({ length: LOG_LIMIT }, (_, day) => ({
      type: 'retired',
      day,
      memberId: mother.id,
    }))
    state = { ...state, log: filler }
    const born = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
    expect(born.log).toHaveLength(LOG_LIMIT)
    expect(born.log[0]).toEqual(filler[1])
    expect(born.log.at(-1)?.type).toBe('born')
  })
})
