import Link from 'next/link'
import { FamilyMark } from '@/ui/family-mark'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-6 py-12">
      <FamilyMark className="size-20" />
      <div className="space-y-4">
        <h1 className="text-5xl font-black tracking-tight">Linhagem</h1>
        <p className="text-ink-soft text-xl leading-snug">
          Comece com um casal, tenha filhos, case os filhos e veja a família atravessar gerações.
        </p>
        <p className="text-ink-soft text-[15px]">
          Um idle game sem anúncios e sem compras. O tempo passa a um mês por segundo e, com o jogo
          fechado, a família segue vivendo por até 5 anos.
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
