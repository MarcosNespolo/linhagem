'use client'

import {
  Baby,
  Briefcase,
  Building2,
  Clock,
  GraduationCap,
  Heart,
  House,
  Landmark,
  School,
  ShoppingCart,
  Siren,
  Sprout,
  Target,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { BALANCE } from '@/content/balance'
import { concursoOf, getCareer, PUBLIC_CAREERS } from '@/content/careers'
import { propertyType, type PropertyId } from '@/content/properties'
import { formatDuration, formatGameSpan, formatMoney } from '@/lib/format'
import { boostLabel } from '../labels'
import { card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

type Topic = { title: string; icon: ReactNode; lines: string[] }

const percent = (value: number) => `${Math.round(value * 100)}%`
/** Quanto um lugar alugado custa a mais que o anterior: "o dobro" ou uma porcentagem. */
const growth = (value: number) =>
  value === 1 ? 'o dobro do anterior' : `${percent(value)} a mais que o anterior`
const span = (days: number) => formatGameSpan(days, BALANCE.daysPerYear)

/** As regras do jogo, poucas linhas por assunto, com os números do balanceamento. */
function topics(): Topic[] {
  const { children, marriage, dating, housing, school, college, careers, concurso, jobs } = BALANCE
  const { layoff } = BALANCE.mishaps
  const homes = (['kitnet', 'apartamento', 'casa'] as PropertyId[])
    .map((id) => `${propertyType(id).name.toLowerCase()} ${propertyType(id).home?.places ?? 0}`)
    .join(', ')
  const stage = school.stages
  const { living, away, tax, properties } = BALANCE
  const { financing } = properties
  const thirteenth = Number(BALANCE.thirteenthSalaryDate.slice(3))
  const cargos = PUBLIC_CAREERS.map((id) => {
    const { cutoff, formation } = concursoOf(id)
    return `${cutoff} ${getCareer(id).name.toLowerCase()}${formation === 'superior' ? '*' : ''}`
  }).join(', ')
  const brackets = tax.brackets
    .map(({ upTo, rate }, index) => {
      const from = index === 0 ? 0 : tax.brackets[index - 1].upTo
      if (rate === 0) return `isento até ${formatMoney(upTo)}`
      return upTo === Infinity
        ? `${percent(rate)} acima de ${formatMoney(from)}`
        : `${percent(rate)} até ${formatMoney(upTo)}`
    })
    .join(', ')
  return [
    {
      title: 'Começo',
      icon: <Sprout size={18} />,
      lines: [
        `Uma pessoa de ${BALANCE.adultAge} anos, com ensino médio, trabalhando desde os ${BALANCE.founder.workSinceAge}, e ${formatMoney(BALANCE.startingMoney)}.`,
        'Mora com os pais, sem aluguel, até casar. O primeiro curso já está liberado.',
        'Casamento e filhos vêm depois do namoro.',
      ],
    },
    {
      title: 'Tempo',
      icon: <Clock size={18} />,
      lines: [
        `1 ano a cada ${formatDuration(12 * BALANCE.secondsPerGameMonth)}.`,
        `Fora do jogo, ${span((away.monthsPerMinute * BALANCE.daysPerYear) / 12)} por minuto, até ${span(away.capYears * BALANCE.daysPerYear)}.`,
        'Para nas escolhas e na pausa.',
      ],
    },
    {
      title: 'Dinheiro',
      icon: <Wallet size={18} />,
      lines: [
        'Todo dia 1º, entram salários, aposentadorias e aluguéis, e saem as despesas do mês.',
        `O 13º cai em ${thirteenth} de dezembro.`,
        `No vermelho, o jogo para. ${span(BALANCE.debt.graceDays)} no vermelho é falência.`,
      ],
    },
    {
      title: 'Custo de vida',
      icon: <ShoppingCart size={18} />,
      lines: [
        `Adulto: padrão de vida de ${formatMoney(living.adult)} ou ${percent(living.lifestyleShare)} da renda, o maior; ônibus ${formatMoney(living.transport.bus)}.`,
        `Carro ${formatMoney(living.transport.car)} para quem ganha a partir de ${formatMoney(living.transport.carFromSalary)}.`,
        `Plano de saúde ${formatMoney(living.health.adult)} (${formatMoney(living.health.senior)} depois dos ${living.seniorAge}) a partir de ${formatMoney(living.health.planFromSalary)} de salário; abaixo, SUS.`,
        `Imposto e INSS por faixa da renda: ${brackets}.`,
        `Criança: ${formatMoney(children.expenseBase)} mais ${formatMoney(children.expensePerYear)} por ano de idade.`,
      ],
    },
    {
      title: 'Moradia',
      icon: <House size={18} />,
      lines: [
        `Lugares: ${homes}.`,
        `Sem lugar em casa: aluguel de ${formatMoney(housing.rentPerPlace)}/mês por pessoa.`,
        `Depois de ${housing.basePlaces} pessoas de aluguel, cada lugar a mais custa ${growth(housing.rentGrowth)}.`,
        'Quem funda a família mora com os pais enquanto está sozinho e solteiro.',
      ],
    },
    {
      title: 'Namoro e casamento',
      icon: <Heart size={18} />,
      lines: [
        `Carnaval e dia dos namorados: ${percent(dating.meetChance)} de chance de conhecer alguém, a partir dos ${BALANCE.adultAge}.`,
        `Pedido depois de ${span(dating.yearsToPropose * BALANCE.daysPerYear)}: casar (${formatMoney(marriage.cost)}), esperar ou terminar.`,
        'O par entra na família e trabalha.',
      ],
    },
    {
      title: 'Filhos',
      icon: <Baby size={18} />,
      lines: [
        `${formatMoney(children.birthCost)} cada.`,
        `Pais de ${children.minParentAge} a ${children.maxParentAge} anos, ${span(children.cooldownDays)} entre um e outro.`,
        'Herdam aparência e aptidão.',
      ],
    },
    {
      title: 'Escola e nota',
      icon: <School size={18} />,
      lines: [
        'Nota = aptidão + idade + estudo.',
        `Idade: +${school.growth.perYear} por ano até os ${school.growth.years}.`,
        `Matrículas em janeiro: creche (${stage.creche.firstAge}–${stage.creche.lastAge} anos), escola (${stage.escola.firstAge}–${stage.escola.lastAge}) e médio (${stage.medio.firstAge}–${stage.medio.lastAge}).`,
        `Instituto federal: prova com ${school.federalCutoff}.`,
        `Professor particular: ${formatMoney(school.tutor.fee)}/mês, +${school.tutor.pointsPerYear} por ano.`,
      ],
    },
    {
      title: 'ENEM e faculdade',
      icon: <GraduationCap size={18} />,
      lines: [
        `ENEM no janeiro dos ${BALANCE.adultAge}: a nota, ±${college.enemSpread}.`,
        'Federal pela nota de corte, particular, técnico, cursinho ou trabalho.',
        `Cursinho: +${college.prep.points} no ENEM seguinte.`,
      ],
    },
    {
      title: 'Trabalho',
      icon: <Briefcase size={18} />,
      lines: [
        `Cada nível pede um curso: ${careers.courseYears.join(', ')} anos, depois de ${careers.minYearsInLevel} anos no nível.`,
        `Mensalidade: ${percent(careers.courseFeeShare)} do aumento.`,
        'Dedicação: metade do tempo, o dobro por mês, sem namoro nem filho.',
        `Com até ${jobs.offers.maxFamily} pessoas na família, quem está numa carreira de ensino médio pode receber proposta de outra, no mesmo nível, pagando ${percent(jobs.offers.minRaise)} a mais; aceitar recomeça o tempo no nível.`,
        `Aposentadoria aos ${BALANCE.retirementAge}, com ${percent(BALANCE.pensionRatio)} do salário.`,
      ],
    },
    {
      title: 'Concurso',
      icon: <Landmark size={18} />,
      lines: [
        `Sem salário, cursinho de ${formatMoney(concurso.fee)}/mês, prova a cada 3 meses; a nota sobe ${concurso.pointsPerMonth} por mês de estudo.`,
        'Quem trabalha e tem o ensino médio pode largar o emprego para estudar, pela ficha da pessoa.',
        `Corte: ${cargos} (*com faculdade).`,
        `A cada ${concurso.maxExams} provas sem passar, decide se continua.`,
        `Sobe com o tempo, sem demissão; aposenta com ${percent(BALANCE.publicPensionRatio)}.`,
      ],
    },
    {
      title: 'Imóveis',
      icon: <Building2 size={18} />,
      lines: [
        'Moradia dá lugar; o resto rende aluguel.',
        `Cada moradia comprada deixa a próxima do tipo ${percent(properties.priceGrowth)} mais cara; comerciais têm preço fixo, até ${properties.maxForSale} à venda de cada tipo.`,
        `ITBI de ${percent(properties.transferTax)} na compra; ${percent(properties.maintenanceShare)} do aluguel vai para a manutenção.`,
        `Inquilino sai ${percent(properties.vacancy.perYear)} ao ano: ${properties.vacancy.months.min} a ${properties.vacancy.months.max} meses vazio, pagando as contas.`,
        `Financiamento: ${percent(financing.downShare)} de entrada, ${percent(financing.monthlyRate)} ao mês por ${financing.years} anos, parcelas até ${percent(financing.maxInstallmentShare)} da renda.`,
      ],
    },
    {
      title: 'Missões',
      icon: <Target size={18} />,
      lines: [
        `${BALANCE.missions.perDay} por dia, até a meia-noite.`,
        `Recompensa: meses de renda ou renda ${boostLabel()} por ${span(BALANCE.missions.boost.years * BALANCE.daysPerYear)}.`,
      ],
    },
    {
      title: 'Imprevistos',
      icon: <Siren size={18} />,
      lines: [
        `Demissão: ${percent(layoff.perYear)} ao ano, ${layoff.months.min} a ${layoff.months.max} meses.`,
        `Seguro-desemprego: ${percent(layoff.unemploymentPay.share)} do salário, até ${formatMoney(layoff.unemploymentPay.max)}; o curso fica trancado.`,
        'Cirurgia e conserto do carro.',
      ],
    },
  ]
}

/** Como jogar: as regras, fora das telas do jogo. */
export function HowToPlaySheet() {
  const closeSheet = useUiStore((store) => store.closeSheet)
  return (
    <Sheet title="Como jogar" onClose={closeSheet}>
      <ul className="mt-2 space-y-2">
        {topics().map((topic) => (
          <li key={topic.title} className={`${card} p-3.5`}>
            <h3 className="text-leaf-strong flex items-center gap-2 text-[15px] font-extrabold">
              {topic.icon}
              {topic.title}
            </h3>
            <ul className="mt-1.5 space-y-0.5 text-[14px]">
              {topic.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
