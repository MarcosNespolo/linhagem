import Link from 'next/link'
import { FamilyMark } from '@/ui/family-mark'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      <FamilyMark className="size-24 drop-shadow-sm" />
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Linhagem</h1>
        <p className="text-lg text-stone-600">
          Um idle game de família. Sem anúncios, sem compras.
        </p>
      </div>
      <Link
        href="/jogar"
        className="rounded-full bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-sm transition active:scale-95"
      >
        Jogar
      </Link>
      <p className="text-sm text-stone-500">Versão em desenvolvimento</p>
    </main>
  )
}
