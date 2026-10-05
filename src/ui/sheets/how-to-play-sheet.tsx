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
  Siren,
  Target,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { BALANCE } from '@/content/balance'
import { MISSIONS } from '@/content/missions'
import { propertyType, type PropertyId } from '@/content/properties'
import { formatGameSpan, formatMoney } from '@/lib/format'
import { card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

type Topic = { title: string; icon: ReactNode; lines: string[] }

const percent = (value: number) => `${Math.round(value * 100)}%`
const span = (days: number) => formatGameSpan(days, BALANCE.daysPerYear)

/** As regras do jogo, poucas linhas por assunto, com os números do balanceamento. */
function topics(): Topic[] {
  const { children, marriage, dating, housing, school, college, careers, concurso } = BALANCE
  const { layoff } = BALANCE.mishaps
  const homes = (['kitnet', 'apartamento', 'casa'] as PropertyId[])
    .map((id) => `${propertyType(id).name.toLowerCase()} ${propertyType(id).home?.places ?? 0}`)
    .join(', ')
  const boostYears = MISSIONS.flatMap((mission) =>
    mission.reward.kind === 'boost' ? [mission.reward.years] : [],
  )[0]
  const stage = school.stages
  return [
    {
      title: 'Tempo',
      icon: <Clock size={18} />,
      lines: [
        `1 ano a cada ${12 * BALANCE.secondsPerGameMonth} segundos.`,
        'Para nas escolhas e na pausa.',
        `Com o jogo fechado, passam até ${BALANCE.offlineCapYears} anos.`,
      ],
    },
    {
      title: 'Dinheiro',
      icon: <Wallet size={18} />,
      lines: [
        `Começa em ${formatMoney(BALANCE.startingMoney)}.`,
        'Entram salários, aposentadorias, aluguéis e o 13º em dezembro.',
        'Saem custo de vida, escolas, cursos e moradia.',
        `No vermelho, o jogo para. ${span(BALANCE.debt.graceDays)} no vermelho é falência.`,
      ],
    },
    {
      title: 'Moradia',
      icon: <House size={18} />,
      lines: [
        `Lugares: ${homes}.`,
        `Sem lugar, ${formatMoney(housing.rentPerPlace)}/mês de aluguel por pessoa.`,
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
        `Cada nível pede um curso: ${careers.courseYears.join(', ')} anos.`,
        `Mensalidade: ${percent(careers.courseFeeShare)} do aumento.`,
        'Dedicação: metade do tempo, o dobro por mês, sem namoro nem filho.',
        `Aposentadoria aos ${BALANCE.retirementAge}, com ${percent(BALANCE.pensionRatio)} do salário.`,
      ],
    },
    {
      title: 'Concurso',
      icon: <Landmark size={18} />,
      lines: [
        `Até ${concurso.maxExams} provas, sem salário, cursinho de ${formatMoney(concurso.fee)}/mês.`,
        `Corte: ${concurso.cutoffs[0]} técnico, ${concurso.cutoffs[1]} analista (com faculdade).`,
        `Sobe com o tempo; aposenta com ${percent(BALANCE.publicPensionRatio)}.`,
      ],
    },
    {
      title: 'Imóveis',
      icon: <Building2 size={18} />,
      lines: [
        'Preço fixo. Moradia dá lugar; o resto rende aluguel.',
        `Comerciais: até ${BALANCE.properties.maxForSale} à venda de cada tipo.`,
      ],
    },
    {
      title: 'Missões',
      icon: <Target size={18} />,
      lines: [
        `${BALANCE.missions.perDay} por dia, até a meia-noite.`,
        `Recompensa: meses de renda ou renda em dobro por ${boostYears} anos.`,
      ],
    },
    {
      title: 'Imprevistos',
      icon: <Siren size={18} />,
      lines: [
        `Demissão: ${percent(layoff.perYear)} ao ano, ${layoff.months.min} a ${layoff.months.max} meses.`,
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
