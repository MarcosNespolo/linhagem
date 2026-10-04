'use client'

import { BALANCE } from '@/content/balance'
import {
  calendarDate,
  checkHaveChild,
  childCost,
  familyRates,
  isAlive,
  livingMembers,
  memberExpense,
  memberIncome,
  type GameState,
  type Member,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { useGameLoop } from '@/game/use-game-loop'
import { formatDate, formatGameSpan, formatMoney, formatRate } from '@/lib/format'
import { childStatus, describeEvent, describeMember, generationLabel } from './labels'

const PACE_LABEL =
  BALANCE.gameMonthsPerSecond === 1
    ? '1 mês por segundo'
    : `${String(BALANCE.gameMonthsPerSecond).replace('.', ',')} meses por segundo`

const primaryButton =
  'shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none'
const secondaryButton =
  'shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700 transition active:scale-95'
const sectionTitle = 'px-1 text-xs font-semibold tracking-wide text-stone-500 uppercase'

/**
 * Tela provisória da Fase 1: mostra a engine rodando, com o mínimo de
 * interação. A interface do jogo (árvore, abas, HUD) chega na Fase 2.
 */
export function Game() {
  useGameLoop()
  const game = useGameStore((store) => store.game)
  const blocked = useGameStore((store) => store.blocked)

  if (blocked) return <BlockedScreen />
  if (!game) {
    return (
      <div className="grid min-h-dvh place-items-center text-stone-500">Carregando a família…</div>
    )
  }
  return <GameScreen game={game} />
}

function GameScreen({ game }: { game: GameState }) {
  const familyEnded = livingMembers(game).length === 0
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <Hud game={game} />
      <main className="flex-1 space-y-6 px-4 pt-4 pb-10">
        <NoticeBanner />
        <AwayBanner />
        {familyEnded ? <FamilyEnded game={game} /> : null}
        {groupByGeneration(game).map(([generation, members]) => (
          <section key={generation} className="space-y-2">
            <h2 className={sectionTitle}>{generationLabel(generation)}</h2>
            <ul className="space-y-2">
              {members.map((member) => (
                <MemberCard key={member.id} game={game} member={member} />
              ))}
            </ul>
          </section>
        ))}
        <RecentEvents game={game} />
        <Footer />
      </main>
    </div>
  )
}

function Hud({ game }: { game: GameState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const { net } = familyRates(game)
  const paused = game.clock.paused

  const rename = () => {
    const name = window.prompt('Nome da família', game.familyName)
    if (name !== null) dispatch({ type: 'renameFamily', name })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={rename}
            className="block max-w-full truncate text-left text-lg font-bold text-indigo-700"
          >
            Família {game.familyName}
          </button>
          <p className="text-sm text-stone-500 tabular-nums">
            {formatDate(calendarDate(game.startDate, game.clock.day))}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums">{formatMoney(game.money)}</p>
          <p
            className={`text-sm font-semibold tabular-nums ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
          >
            {formatRate(net)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-stone-500">{paused ? 'Tempo pausado' : PACE_LABEL}</span>
        <button
          type="button"
          onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}
          className={secondaryButton}
        >
          {paused ? 'Continuar' : 'Pausar'}
        </button>
      </div>
    </header>
  )
}

function MemberCard({ game, member }: { game: GameState; member: Member }) {
  const day = game.clock.day
  const alive = isAlive(member)
  const rate = memberIncome(member, day) - memberExpense(member, day)
  const partner = member.partnerId ? game.members[member.partnerId] : undefined
  const leadsCouple =
    alive && partner !== undefined && isAlive(partner) && memberOrder(member) < memberOrder(partner)

  return (
    <li
      className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 ${alive ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{member.firstName}</p>
          <p className="truncate text-sm text-stone-500">{describeMember(member, day)}</p>
        </div>
        {alive && rate !== 0 ? (
          <p
            className={`shrink-0 text-sm font-semibold tabular-nums ${rate < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
          >
            {formatRate(rate)}
          </p>
        ) : null}
      </div>
      {leadsCouple && partner ? (
        <ChildAction game={game} parent={member} partner={partner} />
      ) : null}
    </li>
  )
}

function ChildAction({
  game,
  parent,
  partner,
}: {
  game: GameState
  parent: Member
  partner: Member
}) {
  const dispatch = useGameStore((store) => store.dispatch)
  const check = checkHaveChild(game, parent.id)
  const cost = childCost(game, parent.id, partner.id)
  const status = childStatus(game, parent, check, cost)

  if (!check.ok && check.error === 'tooOld') {
    return <p className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-500">{status}</p>
  }
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
      <div className="min-w-0 text-sm">
        <p className="font-medium text-stone-800">Filho com {partner.firstName}</p>
        <p className="text-stone-500 tabular-nums">{status}</p>
      </div>
      <button
        type="button"
        disabled={!check.ok}
        onClick={() => dispatch({ type: 'haveChild', parentId: parent.id })}
        className={primaryButton}
      >
        Ter filho
      </button>
    </div>
  )
}

const AVATAR_STYLES = [
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-lime-100 text-lime-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
]

/** Avatar provisório com a inicial. Os avatares procedurais entram na Fase 2. */
function Avatar({ member }: { member: Member }) {
  const style = AVATAR_STYLES[hashText(member.avatarSeed) % AVATAR_STYLES.length]
  return (
    <div
      aria-hidden="true"
      className={`grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold ${style}`}
    >
      {member.firstName.charAt(0)}
    </div>
  )
}

function AwayBanner() {
  const away = useGameStore((store) => store.away)
  const dismiss = useGameStore((store) => store.dismissAway)
  if (!away) return null
  return (
    <div className="rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
      <p className="font-semibold text-indigo-950">Enquanto você esteve fora</p>
      <p className="mt-1 text-sm text-indigo-900">
        Passaram {formatGameSpan(away.days, BALANCE.daysPerYear)} na família e entraram{' '}
        {formatMoney(away.earned)}.
        {away.capped
          ? ` Com o jogo fechado, o tempo anda no máximo ${BALANCE.offlineCapYears} anos.`
          : ''}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 text-sm font-semibold text-indigo-700"
      >
        Fechar
      </button>
    </div>
  )
}

function NoticeBanner() {
  const notice = useGameStore((store) => store.notice)
  const dismiss = useGameStore((store) => store.dismissNotice)
  if (!notice) return null
  return (
    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <p>{notice}</p>
      <button type="button" onClick={dismiss} className="mt-2 font-semibold text-amber-800">
        Entendi
      </button>
    </div>
  )
}

function FamilyEnded({ game }: { game: GameState }) {
  const startNewFamily = useGameStore((store) => store.startNewFamily)
  return (
    <div className="rounded-2xl bg-stone-100 p-4 text-center">
      <p className="font-semibold">A família {game.familyName} chegou ao fim</p>
      <p className="mt-1 text-sm text-stone-600">
        A partir da Fase 4, os filhos adultos vão poder casar e continuar a linhagem.
      </p>
      <button type="button" onClick={() => startNewFamily()} className={`${primaryButton} mt-3`}>
        Começar outra família
      </button>
    </div>
  )
}

function RecentEvents({ game }: { game: GameState }) {
  const recent = useGameStore((store) => store.recent)
  if (recent.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className={sectionTitle}>Acontecimentos</h2>
      <ul className="space-y-1.5 rounded-2xl bg-white p-3 text-sm ring-1 ring-stone-200">
        {recent.map((event, index) => (
          <li key={`${event.type}-${event.memberId}-${event.day}-${index}`} className="flex gap-3">
            <span className="shrink-0 text-stone-400 tabular-nums">
              {formatDate(calendarDate(game.startDate, event.day))}
            </span>
            <span className="text-stone-700">{describeEvent(game, event)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Footer() {
  const startNewFamily = useGameStore((store) => store.startNewFamily)
  const restart = () => {
    if (window.confirm('Começar uma família nova? A atual será apagada.')) startNewFamily()
  }
  return (
    <footer className="space-y-2 pt-4 text-center text-xs text-stone-500">
      <p>
        Tela provisória da Fase 1, para ver a engine rodando. A interface do jogo chega na Fase 2.
      </p>
      <button type="button" onClick={restart} className="underline underline-offset-2">
        Começar outra família
      </button>
    </footer>
  )
}

function BlockedScreen() {
  const notice = useGameStore((store) => store.notice)
  return (
    <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
      <div className="space-y-4">
        <p className="text-lg font-semibold">{notice}</p>
        <button type="button" onClick={() => window.location.reload()} className={primaryButton}>
          Recarregar
        </button>
      </div>
    </div>
  )
}

function groupByGeneration(game: GameState): [number, Member[]][] {
  const groups = new Map<number, Member[]>()
  for (const member of Object.values(game.members)) {
    const group = groups.get(member.generation) ?? []
    group.push(member)
    groups.set(member.generation, group)
  }
  return [...groups.entries()].sort(([a], [b]) => a - b)
}

/** Ordem de criação do membro, a partir do id (m1, m2, ...). */
function memberOrder(member: Member): number {
  return Number(member.id.slice(1))
}

function hashText(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash
}
