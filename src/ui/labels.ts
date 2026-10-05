import { BALANCE } from '@/content/balance'
import { careerLevel, getCareer, PUBLIC_CAREER, topLevel, type CareerId } from '@/content/careers'
import { propertyType, type PropertyId } from '@/content/properties'
import {
  degree,
  isHigherStage,
  techCourseName,
  type DegreeId,
  type Network,
  type SchoolStage,
  type Stage,
  type TechCourseId,
} from '@/content/schools'
import {
  ageOf,
  calendarDate,
  childCooldownDaysLeft,
  courseOffer,
  daysToSeconds,
  hasCar,
  isAlive,
  isUnemployed,
  nextListingDay,
  promotionDay,
  type ChildCheck,
  type Enrollment,
  type Formation,
  type GameEvent,
  type GameState,
  type Member,
  type PropertyEvent,
} from '@/engine'
import { formatAge, formatDuration, formatGameSpan, formatMoney } from '@/lib/format'

/** Escolhe a palavra conforme o gênero do membro. */
export function byGender(member: Pick<Member, 'gender'>, female: string, male: string): string {
  return member.gender === 'f' ? female : male
}

/** Primeira letra minúscula, para usar um cargo no meio da frase. */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function careerTitle(member: Pick<Member, 'career' | 'gender'>): string | null {
  if (!member.career) return null
  return careerLevel(member.career.id, member.career.level).title[member.gender]
}

/** Título do cargo de um nível da carreira, na forma do gênero da pessoa. */
export function levelTitle(
  member: Pick<Member, 'gender'> | undefined,
  careerId: CareerId,
  level: number,
): string {
  return careerLevel(careerId, level).title[member?.gender ?? 'f']
}

/**
 * Nome do curso que leva ao nível, para o meio da frase: capacitação para o 2º,
 * especialização para o 3º, pós-graduação para o 4º e MBA para o 5º.
 */
export function courseName(level: number): string {
  return ['curso de capacitação', 'curso de especialização', 'pós-graduação', 'MBA'][
    Math.min(Math.max(level - 1, 0), 3)
  ]
}

/** Primeira letra maiúscula, para começar uma linha. */
export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Nível em texto: "1º nível", "4º nível". */
export function levelLabel(level: number): string {
  return `${level + 1}º nível`
}

/** Carreira e nível: "Comércio · 3º nível". */
export function careerLine(careerId: CareerId, level: number): string {
  return `${getCareer(careerId).name} · ${levelLabel(level)}`
}

/**
 * Situação da próxima promoção de quem trabalha: o curso em andamento, o curso
 * que dá para começar, a promoção do serviço público ou o topo. Null para quem
 * não trabalha mais.
 */
export function promotionStatus(member: Member, day: number): string | null {
  const career = member.career
  if (!career || !isAlive(member) || ageOf(member, day) >= BALANCE.retirementAge) return null
  const span = (until: number) => formatGameSpan(Math.max(1, until - day), BALANCE.daysPerYear)
  if (member.course) {
    return `${member.course.dedicated ? 'Curso com dedicação' : 'Curso'}: falta ${span(member.course.until)}`
  }
  if (career.level >= topLevel(career.id)) return 'Topo da carreira'
  const due = promotionDay(career)
  if (due !== null) return `Promoção em ${span(due)}`
  return courseOffer(member, day, false) ? 'Curso disponível' : null
}

/** O que a pessoa é ou faz hoje: "Bebê", "Estudante de Direito", "Enfermeira", "Aposentado". */
export function roleLabel(member: Member, day: number): string {
  const age = ageOf(member, day)
  if (age < 3) return 'Bebê'
  const school = member.education.school
  if (school?.stage === 'faculdade' && school.degree) {
    return `Estudante de ${degree(school.degree).name}`
  }
  if (school?.stage === 'tecnico') return 'Estudante de curso técnico'
  if (school?.stage === 'cursinho') return 'No cursinho'
  if (member.concurso) return 'Estudando para concurso'
  if (age >= BALANCE.retirementAge) return byGender(member, 'Aposentada', 'Aposentado')
  if (member.career && isUnemployed(member, day)) {
    return byGender(member, 'Desempregada, procurando emprego', 'Desempregado, procurando emprego')
  }
  const title = careerTitle(member)
  if (title) return title
  if (age < 13) return 'Criança'
  if (age < BALANCE.adultAge && school) return 'Adolescente'
  return 'Procurando o primeiro emprego'
}

/** Idade em texto, com "Faleceu aos" para quem já morreu. */
export function ageLabel(member: Member, day: number): string {
  const age = ageOf(member, day)
  if (!isAlive(member)) return `Faleceu aos ${formatAge(age)}`
  if (age === 0) return 'Menos de 1 ano'
  return formatAge(age)
}

/**
 * Custo de vida da pessoa em partes, sem a moradia: o de uma criança, ou o
 * mercado, o plano de saúde e o transporte de um adulto.
 */
export function livingCostLine(member: Member, day: number): string {
  const age = ageOf(member, day)
  if (age < BALANCE.adultAge) return 'Alimentação, roupas, saúde e lazer'
  const { adult, health, seniorAge, transport } = BALANCE.living
  const plan = age >= seniorAge ? health.senior : health.adult
  const ride = hasCar(member, day)
    ? `carro ${formatMoney(transport.car)}`
    : `ônibus ${formatMoney(transport.bus)}`
  return `Mercado e contas ${formatMoney(adult)} · plano de saúde ${formatMoney(plan)} · ${ride}`
}

/** Como a pessoa se liga à família: filha de quem, com quem casou, se fundou. */
export function relationLine(state: GameState, member: Member): string {
  const partner = member.partnerId ? state.members[member.partnerId] : undefined
  if (member.origin === 'founder') {
    return byGender(member, 'Fundadora da família', 'Fundador da família')
  }
  if (member.origin === 'married') {
    const name = partner?.firstName ?? 'alguém da família'
    return `Entrou na família ao casar com ${name}`
  }
  const parents = member.parentIds.map((id) => state.members[id]?.firstName).filter(Boolean)
  return `${byGender(member, 'Filha', 'Filho')} de ${parents.join(' e ')}`
}

/** Geração em palavras, contando a partir dos fundadores. */
export function generationLabel(generation: number): string {
  const labels = ['Fundadores', 'Filhos', 'Netos', 'Bisnetos', 'Trinetos', 'Tetranetos']
  return labels[generation] ?? `${generation}ª geração`
}

/** Frase curta sobre um acontecimento, para avisos e para o histórico. */
export function describeEvent(state: GameState, event: GameEvent): string {
  if (event.type === 'thirteenth') return `Chegou o 13º salário: ${formatMoney(event.amount)}`
  if (event.type === 'propertyBought') return purchaseText(event)
  if (event.type === 'inDebt') return 'A família entrou no vermelho'
  if (event.type === 'outOfDebt') return 'A família saiu do vermelho'
  if (event.type === 'bankrupt') return 'A família foi à falência'
  const member = state.members[event.memberId]
  const name = member?.firstName ?? 'Alguém'
  switch (event.type) {
    case 'born':
      return `${name} nasceu`
    case 'becameAdult':
      return `${name} fez ${BALANCE.adultAge} anos`
    case 'firstJob': {
      const title = lowerFirst(levelTitle(member, event.careerId, event.level ?? 0))
      return event.careerId === PUBLIC_CAREER
        ? `${name} tomou posse como ${title}`
        : `${name} começou a trabalhar como ${title}`
    }
    case 'promoted': {
      const title = lowerFirst(levelTitle(member, event.careerId, event.level))
      return `${name} ${member ? byGender(member, 'foi promovida', 'foi promovido') : 'subiu'} a ${title}`
    }
    case 'concursoStarted':
      return `${name} começou a estudar para concurso`
    case 'concurso': {
      if (event.level === null) return `${name} não passou no concurso: nota ${event.score}`
      const title = lowerFirst(levelTitle(member, PUBLIC_CAREER, event.level))
      return `${name} passou no concurso para ${title}, com nota ${event.score}`
    }
    case 'datingStarted':
      return `${name} começou a namorar ${event.partnerName}`
    case 'breakup':
      return `${name} e ${event.partnerName} terminaram o namoro`
    case 'married': {
      const partner = state.members[event.partnerId]
      return `${name} casou com ${partner?.firstName ?? 'alguém'}`
    }
    case 'leftHome': {
      const partner = state.members[event.partnerId]
      return `${name} e ${partner?.firstName ?? 'o par'} foram formar a própria família`
    }
    case 'laidOff': {
      const months = Math.round(((event.until - event.day) * 12) / BALANCE.daysPerYear)
      const who = member ? byGender(member, 'foi demitida', 'foi demitido') : 'perdeu o emprego'
      return `${name} ${who} e vai ficar ${months} meses sem salário`
    }
    case 'rehired':
      return `${name} achou outro emprego`
    case 'mishap':
      return event.kind === 'surgery'
        ? `${name} precisou de uma cirurgia: ${formatMoney(event.cost)}`
        : `O carro de ${name} quebrou: ${formatMoney(event.cost)} de conserto`
    case 'retired':
      return `${name} se aposentou`
    case 'died':
      return `${name} faleceu aos ${formatAge(event.age)}`
    case 'schoolStarted':
      return `${name} ${schoolStartText(event.stage, event.network, event.course, event.degree)}`
    case 'schoolChanged':
      return event.network === 'particular'
        ? `${name} mudou para um colégio particular`
        : `${name} mudou para a escola pública`
    case 'schoolFinished':
      if (event.formation.level === 'superior') {
        return `${name} se formou em ${degree(event.formation.degree).name}`
      }
      if (event.formation.level === 'tecnico') {
        const title = member ? formationLabel(member, event.formation) : 'Técnico'
        return `${name} se formou ${lowerFirst(title)}`
      }
      return `${name} terminou o ensino médio`
    case 'enem':
      return `Saiu a nota do ENEM de ${name}: ${event.score} pontos`
  }
}

/** Compra de imóvel: "A família comprou um kitnet", "A família comprou a 3ª casa". */
function purchaseText(event: PropertyEvent): string {
  const type = propertyType(event.propertyId)
  const name = type.name.toLowerCase()
  const female = type.gender === 'f'
  if (event.count === 1) return `A família comprou ${female ? 'uma' : 'um'} ${name}`
  return `A família comprou ${female ? 'a' : 'o'} ${event.count}${female ? 'ª' : 'º'} ${name}`
}

/** O que a pessoa começou na matrícula, para o histórico. */
function schoolStartText(
  stage: Stage,
  network: Network,
  course?: TechCourseId,
  degreeId?: DegreeId,
): string {
  const technical = course ? `técnico em ${techCourseName(course)}` : 'técnico'
  switch (stage) {
    case 'creche':
      if (network === 'avos') return 'vai ficar com os avós até a escola'
      if (network === 'casa') return 'vai ficar em casa até a escola'
      return network === 'publica' ? 'entrou na creche pública' : 'entrou numa creche particular'
    case 'escola':
      return network === 'particular'
        ? 'começou a escola num colégio particular'
        : 'começou a escola na rede municipal'
    case 'medio':
      if (network === 'federal') return `começou o ensino médio no instituto federal, ${technical}`
      return network === 'particular'
        ? 'começou o ensino médio num colégio particular'
        : 'começou o ensino médio na escola estadual'
    case 'cursinho':
      return 'entrou no cursinho para fazer o ENEM de novo'
    case 'tecnico':
      return network === 'federal'
        ? `começou o curso ${technical} no instituto federal`
        : `começou o curso ${technical}`
    case 'faculdade': {
      const name = degreeId ? degree(degreeId).name : 'a faculdade'
      return network === 'federal'
        ? `entrou na universidade federal para cursar ${name}`
        : `começou ${name} numa faculdade particular`
    }
  }
}

/** Nome da rede numa etapa: "Creche pública", "Escola municipal", "Universidade federal". */
export function schoolName(stage: Stage, network: Network): string {
  if (stage === 'cursinho') return 'Cursinho'
  if (stage === 'faculdade') {
    return network === 'federal' ? 'Universidade federal' : 'Faculdade particular'
  }
  if (stage === 'tecnico') {
    return network === 'federal' ? 'Instituto federal' : 'Curso técnico particular'
  }
  switch (network) {
    case 'publica':
      return stage === 'creche'
        ? 'Creche pública'
        : stage === 'escola'
          ? 'Escola municipal'
          : 'Escola estadual'
    case 'particular':
      return stage === 'creche' ? 'Creche particular' : 'Colégio particular'
    case 'federal':
      return 'Instituto federal'
    case 'avos':
      return 'Com os avós'
    case 'casa':
      return 'Em casa'
  }
}

/** Nome da rede com artigo, para o meio da frase: "a escola municipal", "o colégio particular". */
export function schoolNameInSentence(stage: Stage, network: Network): string {
  const name = schoolName(stage, network).toLowerCase()
  if (network === 'avos' || network === 'casa') return name
  return /^(colégio|instituto|cursinho|curso)/.test(name) ? `o ${name}` : `a ${name}`
}

/** Ano escolar pela idade que a criança faz no ano: "Pré-escola", "3º ano do fundamental". */
export function gradeLabel(stage: SchoolStage, ageThisYear: number): string {
  if (stage === 'creche') return 'Creche'
  if (stage === 'medio') return `${ageThisYear - 14}º ano do médio`
  return ageThisYear <= 5 ? 'Pré-escola' : `${ageThisYear - 5}º ano do fundamental`
}

/** Ano de quem está no cursinho, no técnico ou na faculdade: "2º ano de Direito". */
export function higherGradeLabel(school: Enrollment): string {
  const left = school.yearsLeft ?? 1
  if (school.stage === 'cursinho') return 'Cursinho para o ENEM'
  if (school.stage === 'tecnico') {
    const year = BALANCE.college.technical.years - left + 1
    return `${year}º ano do técnico${school.course ? ` em ${techCourseName(school.course)}` : ''}`
  }
  if (school.degree) {
    const course = degree(school.degree)
    return `${course.years - left + 1}º ano de ${course.name}`
  }
  return 'Faculdade'
}

/** Ano escolar de qualquer matrícula, da creche à faculdade. */
export function schoolYearLabel(school: Enrollment, ageThisYear: number): string {
  return isHigherStage(school.stage)
    ? higherGradeLabel(school)
    : gradeLabel(school.stage, ageThisYear)
}

/** Formação em palavras: "Ensino médio", "Técnica em Informática", "Formado em Direito". */
export function formationLabel(member: Pick<Member, 'gender'>, formation: Formation): string {
  if (formation.level === 'medio') return 'Ensino médio'
  if (formation.level === 'superior') {
    return `${byGender(member, 'Formada', 'Formado')} em ${degree(formation.degree).name}`
  }
  return `${byGender(member, 'Técnica', 'Técnico')} em ${techCourseName(formation.course)}`
}

/** Ano do calendário em que um acontecimento aconteceu. */
export function eventYear(state: GameState, event: GameEvent): string {
  return calendarDate(state.startDate, event.day).slice(0, 4)
}

/** Status do casal para ter um filho: o custo, ou o que falta para poder. */
export function childStatus(
  state: GameState,
  parent: Member,
  check: ChildCheck,
  cost: number,
): string {
  if (check.ok) return `Custa ${formatMoney(cost)}`
  switch (check.error) {
    case 'tooYoung':
      return `Os dois precisam ter ${BALANCE.children.minParentAge} anos`
    case 'tooOld':
      return 'Passaram da idade de ter filhos'
    case 'cooldown': {
      const days = childCooldownDaysLeft(state, parent.id)
      return `Próximo filho em ${formatDuration(daysToSeconds(days))}`
    }
    case 'notEnoughMoney':
      return `Custa ${formatMoney(cost)}, faltam ${formatMoney(cost - state.money)}`
    case 'dedicated':
      return 'Curso com dedicação até terminar'
    default:
      return ''
  }
}

/** Quantos comerciais do tipo estão à venda, quanto tempo levam para se pagar e quando sai o próximo. */
export function marketLine(game: GameState, id: PropertyId, left: number, payback: string): string {
  const next = nextListingDay(game, id)
  const wait = next === null ? '' : formatGameSpan(next - game.clock.day, BALANCE.daysPerYear)
  if (left <= 0) return `Nenhum à venda · o próximo aparece em ${wait}`
  const more = left < BALANCE.properties.maxForSale ? ` · outro aparece em ${wait}` : ''
  return `${left} à venda · se paga em ${payback}${more}`
}

/** Prazo para o imóvel se pagar. Acima de mil anos, o número exato não ajuda a decidir. */
export function paybackLabel(years: number): string {
  return years >= 1000 ? 'mais de mil anos' : `${years} anos`
}
