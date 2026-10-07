import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { isPublicCareer, MEDIO_CAREERS } from '@/content/careers'
import {
  applyAction,
  careerOptions,
  checkChangeCareer,
  isUnemployed,
  topSalary,
  type GameState,
} from '@/engine'
import {
  expectOk,
  lastMember,
  makeGame,
  makeStart,
  setMember,
  withChild,
  withMoney,
} from '../helpers'

function change(state: GameState, careerId: Parameters<typeof checkChangeCareer>[2]) {
  return expectOk(applyAction(state, { type: 'changeCareer', memberId: 'm1', careerId })).state
}

describe('mudar de carreira', () => {
  it('quem tem o médio pode ir para as outras carreiras de ensino médio, da que paga mais no topo', () => {
    const state = makeStart()
    const current = state.members.m1.career?.id
    const options = careerOptions(state.members.m1)
    expect(options.map((offer) => offer.careerId).sort()).toEqual(
      MEDIO_CAREERS.filter((id) => id !== current).sort(),
    )
    expect(options.every((offer) => offer.level === 0)).toBe(true)
    const tops = options.map((offer) => topSalary(offer.careerId))
    expect(tops).toEqual([...tops].sort((a, b) => b - a))
  })

  it('a formação abre a carreira da área, um nível acima quando passa do que ela pede', () => {
    const state = makeStart()
    const member = state.members.m1
    const nurse = careerOptions({
      ...member,
      education: { ...member.education, formation: { level: 'tecnico', course: 'enfermagem' } },
    })
    expect(nurse).toContainEqual({ careerId: 'saude', level: 0 })
    const graduate = careerOptions({
      ...member,
      education: { ...member.education, formation: { level: 'superior', degree: 'enfermagem' } },
    })
    expect(graduate).toContainEqual({ careerId: 'saude', level: 1 })
    const doctor = careerOptions({
      ...member,
      education: { ...member.education, formation: { level: 'superior', degree: 'medicina' } },
    })
    expect(doctor[0]).toEqual({ careerId: 'medicina', level: 0 })
  })

  it('recomeça do nível de entrada, com o tempo contando de hoje', () => {
    const start = withMoney(makeStart(), 1_000_000)
    const target = careerOptions(start.members.m1)[0].careerId
    const changed = change(start, target)
    expect(changed.members.m1.career).toEqual({ id: target, level: 0, levelSince: 0 })
    expect(changed.log.at(-1)).toEqual({
      type: 'startedOver',
      day: 0,
      memberId: 'm1',
      careerId: target,
      level: 0,
    })
  })

  it('o curso em andamento para, e quem estava desempregado volta a trabalhar', () => {
    const start = withMoney(makeStart(), 1_000_000)
    const inCourse = expectOk(
      applyAction(start, { type: 'startCourse', memberId: 'm1', dedicated: false }),
    ).state
    const target = careerOptions(start.members.m1)[0].careerId
    expect(change(inCourse, target).members.m1.course).toBeNull()

    const laidOff = setMember(start, 'm1', { unemployedUntil: 200 })
    expect(isUnemployed(laidOff.members.m1, 0)).toBe(true)
    const hired = change(laidOff, target).members.m1
    expect(hired.unemployedUntil).toBeNull()
    expect(isUnemployed(hired, 0)).toBe(false)
  })

  it('servidor que muda de carreira deixa o serviço público', () => {
    const start = setMember(withMoney(makeStart(), 1_000_000), 'm1', {
      career: { id: 'estado', level: 2, levelSince: 0 },
    })
    const changed = change(start, 'comercio')
    const career = changed.members.m1.career
    expect(career?.id).toBe('comercio')
    expect(career && isPublicCareer(career.id)).toBe(false)
  })

  it('não muda para carreira pública, para a que a formação não abre, nem com escolha aberta', () => {
    const start = makeStart()
    expect(checkChangeCareer(start, 'm1', 'prefeitura')).toEqual({
      ok: false,
      error: 'careerNotAllowed',
    })
    expect(checkChangeCareer(start, 'm1', 'medicina')).toEqual({
      ok: false,
      error: 'careerNotAllowed',
    })
    const current = start.members.m1.career?.id
    if (current) {
      expect(checkChangeCareer(start, 'm1', current)).toEqual({
        ok: false,
        error: 'careerNotAllowed',
      })
    }
    const asking = applyAction(withMoney(start, 1_000_000), {
      type: 'returnToSchool',
      memberId: 'm1',
    })
    if (!asking.ok) throw new Error('A escolha do que estudar devia abrir')
    expect(checkChangeCareer(asking.state, 'm1', 'comercio')).toEqual({
      ok: false,
      error: 'choiceOpen',
    })
    const family = withChild(makeGame())
    expect(checkChangeCareer(family, lastMember(family).id, 'comercio')).toEqual({
      ok: false,
      error: 'notWorking',
    })
    const retired = setMember(start, 'm1', {
      birthDay: -BALANCE.retirementAge * BALANCE.daysPerYear,
    })
    expect(checkChangeCareer(retired, 'm1', 'comercio')).toEqual({
      ok: false,
      error: 'notWorking',
    })
  })
})
