'use client'

import { Shuffle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ageOf, FAMILY_NAME_MAX_LENGTH, newGame, type GameState } from '@/engine'
import { localDate, useGameStore, type SetupDraft } from '@/game/store'
import { formatAge } from '@/lib/format'
import { PersonAvatar } from './avatar/person-avatar'
import { FamilyMark } from './family-mark'
import { roleLabel } from './labels'
import { CloudLoginSheet } from './sheets/cloud-login-sheet'
import { button } from './styles'
import { useUiStore } from './ui-store'

/** Tela de criar família: mostra o casal fundador sorteado e pede o sobrenome. */
export function NewFamily({ draft, current }: { draft: SetupDraft; current: GameState | null }) {
  const startWithGame = useGameStore((store) => store.startWithGame)
  const rerollSetup = useGameStore((store) => store.rerollSetup)
  const closeSetup = useGameStore((store) => store.closeSetup)
  const base = useMemo(
    () => newGame({ seed: draft.seed, now: draft.now, startDate: localDate(draft.now) }),
    [draft],
  )
  const [typedName, setTypedName] = useState<string | null>(null)
  const name = typedName ?? base.familyName
  const trimmed = name.trim()
  const founders = Object.values(base.members)

  const start = (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmed) return
    startWithGame({ ...base, familyName: trimmed })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),2.5rem)] pb-10">
      <FamilyMark className="size-14" />
      <h1 className="mt-5 text-[32px] leading-9 font-black tracking-tight">Comece uma família</h1>
      <p className="text-ink-soft mt-2 text-[16px]">
        Este é o casal que começa a linhagem. Se quiser, sorteie outro.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {founders.map((founder) => (
          <li key={founder.id} className="bg-surface ring-line rounded-3xl p-4 text-center ring-1">
            <PersonAvatar person={founder} day={0} size={96} className="mx-auto rounded-full" />
            <p className="mt-2 text-[17px] font-extrabold">{founder.firstName}</p>
            <p className="text-ink-soft text-[14px]">{formatAge(ageOf(founder, 0))}</p>
            <p className="text-[14px] font-semibold">{roleLabel(founder, 0)}</p>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${button.secondary} mt-3 self-center`}
        onClick={rerollSetup}
      >
        <Shuffle size={16} />
        Sortear outro casal
      </button>

      <form onSubmit={start} className="mt-8">
        <label htmlFor="new-family-name" className="text-[15px] font-bold">
          Sobrenome da família
        </label>
        <input
          id="new-family-name"
          value={name}
          onChange={(event) => setTypedName(event.target.value)}
          maxLength={FAMILY_NAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="words"
          className="bg-surface ring-line focus:ring-leaf mt-2 w-full rounded-2xl px-4 py-3 text-lg font-bold ring-1 outline-none focus:ring-2"
        />
        <button type="submit" className={`${button.primary} mt-4 w-full`} disabled={!trimmed}>
          Começar a família {trimmed}
        </button>
      </form>

      {current ? (
        <button type="button" className={`${button.quiet} mt-3 self-center`} onClick={closeSetup}>
          Voltar para a família {current.familyName}
        </button>
      ) : (
        <CloudStart />
      )}
    </main>
  )
}

/** No primeiro acesso: entrar para continuar uma família que já está na nuvem. */
function CloudStart() {
  const cloud = useGameStore((store) => store.cloud)
  const sheet = useUiStore((store) => store.sheet)
  const openSheet = useUiStore((store) => store.openSheet)

  let status: string | null = null
  if (cloud.mode === 'signedIn') {
    if (cloud.problem === 'offline') status = 'Sem conexão para buscar a família na nuvem.'
    else if (cloud.problem) status = 'Não deu para buscar a família na nuvem agora.'
    else if (cloud.syncedAt === null) status = 'Procurando sua família na nuvem…'
    else
      status =
        'Não há família salva na nuvem com este e-mail. A que você começar agora fica guardada nela.'
  }

  return (
    <>
      {status ? (
        <p className="text-ink-soft mt-4 text-center text-[14px]">{status}</p>
      ) : cloud.mode === 'signedOut' ? (
        <button
          type="button"
          className={`${button.quiet} mt-3 self-center`}
          onClick={() => openSheet({ kind: 'cloudLogin' })}
        >
          Já tenho uma família salva na nuvem
        </button>
      ) : null}
      {sheet?.kind === 'cloudLogin' ? <CloudLoginSheet /> : null}
    </>
  )
}
