import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { advance, applyAction, isMemberEvent, LOG_LIMIT, type MemberEvent } from '@/engine'
import { expectOk, founders, makeGame, withAdultChild, withMoney, years } from '../helpers'

describe('histórico', () => {
  it('começa vazio', () => {
    expect(makeGame().log).toEqual([])
  })

  it('guarda nascimentos, casamentos e o que acontece com o tempo, em ordem', () => {
    const { state, childId } = withAdultChild(3)
    const types = state.log.map((event) => event.type)
    expect(types).toEqual([
      'born',
      'schoolStarted',
      'schoolStarted',
      'schoolStarted',
      'schoolFinished',
      'enem',
      'firstJob',
      'becameAdult',
    ])
    expect(state.log.every((event) => event.memberId === childId)).toBe(true)

    const searched = expectOk(applyAction(state, { type: 'findSuitors', memberId: childId })).state
    const married = expectOk(
      applyAction(searched, { type: 'marry', memberId: childId, suitorIndex: 0 }),
    ).state
    expect(married.log.at(-1)?.type).toBe('married')
  })

  it('o histórico do estado inclui os eventos devolvidos por advance, menos o 13º', () => {
    const { state } = withAdultChild(3)
    const result = advance(state, years(BALANCE.retirementAge))
    const added = result.state.log.slice(state.log.length)
    expect(result.events.some((event) => event.type === 'thirteenth')).toBe(true)
    expect(added).toEqual(result.events.filter(isMemberEvent).slice(-added.length))
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
