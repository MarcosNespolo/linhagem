'use client'

import { BookOpen, ExternalLink, Pencil } from 'lucide-react'
import { useState } from 'react'
import { livingMembers, type GameState } from '@/engine'
import { useGameStore, type CloudState } from '@/game/store'
import { formatDuration } from '@/lib/format'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'

const REPOSITORY = 'https://github.com/MarcosNespolo/linhagem'

/** Aba Ajustes: nome da família, tempo, nuvem, exibição da árvore e nova partida. */
export function SettingsTab({ game }: { game: GameState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const openSheet = useUiStore((store) => store.openSheet)
  const showDeceased = useUiStore((store) => store.showDeceased)
  const setShowDeceased = useUiStore((store) => store.setShowDeceased)
  const signedIn = useGameStore((store) => store.cloud.mode === 'signedIn')
  const paused = game.clock.paused
  const total = Object.keys(game.members).length
  const living = livingMembers(game).length

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 pt-5 pb-10">
      <button
        type="button"
        className={`${button.secondary} w-full`}
        onClick={() => openSheet({ kind: 'howToPlay' })}
      >
        <BookOpen size={16} />
        Como jogar
      </button>

      <section>
        <h2 className="px-1 text-lg font-extrabold">Família {game.familyName}</h2>
        <p className="tabular text-ink-soft px-1 text-[14px]">
          {living === 1 ? '1 pessoa viva' : `${living} pessoas vivas`}, {total} ao longo da história
        </p>
        <div className={`${card} divide-line mt-3 divide-y`}>
          <Row label="Nome da família" detail={game.familyName}>
            <button
              type="button"
              className={button.secondary}
              onClick={() => openSheet({ kind: 'rename' })}
            >
              <Pencil size={15} />
              Mudar
            </button>
          </Row>
          <Row label="Tempo" detail={paused ? 'Pausado' : 'Andando'}>
            <button
              type="button"
              className={button.secondary}
              onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}
            >
              {paused ? 'Continuar' : 'Pausar'}
            </button>
          </Row>
        </div>
      </section>

      <CloudSection now={game.lastSimulatedAt} />

      <section>
        <h2 className="px-1 text-lg font-extrabold">Árvore</h2>
        <div className={`${card} mt-3`}>
          <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
            <span>
              <span className="block text-[16px] font-bold">Mostrar quem já faleceu</span>
              {game.stats.archived > 0 ? (
                <span className="tabular text-ink-soft block text-[14px]">
                  {game.stats.archived} de ramos antigos fora da árvore
                </span>
              ) : null}
            </span>
            <input
              type="checkbox"
              checked={showDeceased}
              onChange={(event) => setShowDeceased(event.target.checked)}
              className="accent-leaf size-6 shrink-0"
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="px-1 text-lg font-extrabold">Partida</h2>
        <div className={`${card} mt-3 p-4`}>
          <p className="text-ink-soft text-[15px]">
            {signedIn ? 'Salvo neste aparelho e na nuvem' : 'Salvo neste aparelho'}
          </p>
          <button
            type="button"
            className={`${button.quiet} text-expense hover:text-expense mt-2 -ml-3`}
            onClick={() => openSheet({ kind: 'confirmNewFamily' })}
          >
            Começar outra família
          </button>
        </div>
      </section>

      <section className="text-ink-soft px-1 text-[14px]">
        <p>Linhagem é um jogo sem anúncios e sem compras. O código é aberto.</p>
        <a
          href={REPOSITORY}
          target="_blank"
          rel="noreferrer"
          className="text-leaf mt-1 inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline"
        >
          Ver o código
          <ExternalLink size={14} />
        </a>
      </section>
    </div>
  )
}

/**
 * Conta da nuvem: entrar, ver se está sincronizado, resolver conflitos e sair. `now` é o instante
 * até onde o jogo foi simulado, que anda a cada segundo.
 */
function CloudSection({ now }: { now: number }) {
  const cloud = useGameStore((store) => store.cloud)
  const signOut = useGameStore((store) => store.signOut)
  const resolveConflict = useGameStore((store) => store.resolveConflict)
  const setConflictHidden = useGameStore((store) => store.setConflictHidden)
  const openSheet = useUiStore((store) => store.openSheet)
  const [signOutFailed, setSignOutFailed] = useState(false)
  if (cloud.mode === 'disabled') return null

  const leave = async () => {
    const result = await signOut()
    setSignOutFailed(!result.ok)
  }

  return (
    <section>
      <h2 className="px-1 text-lg font-extrabold">Nuvem</h2>
      <div className={`${card} divide-line mt-3 divide-y`}>
        {cloud.mode === 'signedIn' ? (
          <Row
            label={cloud.email ?? 'Conta conectada'}
            detail={
              signOutFailed
                ? 'Não deu para sair agora. Tente de novo com conexão.'
                : cloudStatus(cloud, now)
            }
          >
            <button type="button" className={button.secondary} onClick={() => void leave()}>
              Sair
            </button>
          </Row>
        ) : (
          <Row label="Salvar na nuvem" detail="Continue em outro aparelho">
            <button
              type="button"
              className={button.secondary}
              disabled={cloud.mode === 'loading'}
              onClick={() => openSheet({ kind: 'cloudLogin' })}
            >
              Entrar
            </button>
          </Row>
        )}
        {cloud.conflict ? (
          <Row label="Duas versões da família" detail="Escolha qual continuar.">
            <button
              type="button"
              className={button.secondary}
              onClick={() => setConflictHidden(false)}
            >
              Escolher
            </button>
          </Row>
        ) : null}
        {cloud.problem === 'unreadable' ? (
          <Row
            label="Save da nuvem ilegível"
            detail="Dá para trocá-lo pela família deste aparelho."
          >
            <button
              type="button"
              className={button.secondary}
              onClick={() => resolveConflict('local')}
            >
              Trocar
            </button>
          </Row>
        ) : null}
      </div>
    </section>
  )
}

function cloudStatus(cloud: CloudState, now: number): string {
  if (cloud.conflict) return 'Parada até você escolher a versão.'
  switch (cloud.problem) {
    case 'offline':
      return 'Sem conexão. Salvo neste aparelho.'
    case 'failed':
      return 'Não sincronizou. Tentando de novo.'
    case 'futureVersion':
      return 'Versão mais nova na nuvem. Recarregue a página.'
    case 'unreadable':
      return 'O save da nuvem não pôde ser lido.'
    case null:
      break
  }
  if (cloud.syncedAt === null) return 'Sincronizando…'
  const seconds = (now - cloud.syncedAt) / 1_000
  return seconds < 5 ? 'Sincronizado agora.' : `Sincronizado há ${formatDuration(seconds)}.`
}

function Row({
  label,
  detail,
  children,
}: {
  label: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-bold">{label}</span>
        <span className="text-ink-soft block text-[14px]">{detail}</span>
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  )
}
