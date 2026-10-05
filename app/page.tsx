import Link from 'next/link'
import { BALANCE } from '@/content/balance'
import { formatDuration, formatGameSpan } from '@/lib/format'
import { FamilyMark } from '@/ui/family-mark'

const { away, daysPerYear } = BALANCE
const span = (days: number) => formatGameSpan(days, daysPerYear)
/** Quanto dura um ano do jogo em tempo real. */
const yearTime = formatDuration(12 * BALANCE.secondsPerGameMonth)
/** Quanto tempo do jogo passa por minuto fora dele, e o máximo. */
const awayTime = `${span((away.monthsPerMinute * daysPerYear) / 12)} por minuto, até ${span(away.capYears * daysPerYear)}`

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-6 py-12">
      <FamilyMark className="size-20" />
      <div className="space-y-4">
        <h1 className="text-5xl font-black tracking-tight">Linhagem</h1>
        <p className="text-ink-soft text-xl leading-snug">
          Comece com uma pessoa de 18 anos, case, tenha filhos e veja a família atravessar gerações.
        </p>
        <p className="text-ink-soft text-[15px]">
          Sem anúncios e sem compras. 1 ano a cada {yearTime}; fora do jogo, {awayTime}.
        </p>
      </div>
      <Link
        href="/jogar"
        className="bg-leaf self-start rounded-full px-8 py-3.5 text-lg font-bold text-white transition active:scale-95"
      >
        Jogar
      </Link>
    </main>
  )
}
