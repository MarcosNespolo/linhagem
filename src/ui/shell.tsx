'use client'

import { familyRates, livingMembers, type GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { BottomNav } from './bottom-nav'
import { showMember } from './flows'
import { generationLabel } from './labels'
import { loveActions, nodeActions, type LoveActions } from './selectors'
import { AwaySheet } from './sheets/away-sheet'
import { CloudLoginSheet } from './sheets/cloud-login-sheet'
import { ConfirmNewFamilySheet } from './sheets/confirm-new-family-sheet'
import { ConflictSheet } from './sheets/conflict-sheet'
import { MemberSheet } from './sheets/member-sheet'
import { PartnerSheet } from './sheets/partner-sheet'
import { RenameSheet } from './sheets/rename-sheet'
import { button } from './styles'
import { HistoryTab } from './tabs/history-tab'
import { LoveTab } from './tabs/love-tab'
import { SettingsTab } from './tabs/settings-tab'
import { Toasts } from './toasts'
import { FamilyTree } from './tree/family-tree'
import { Hud } from './hud'
import { useUiStore, type Sheet } from './ui-store'

/** Tela do jogo: HUD em cima, a aba escolhida no meio e a navegação embaixo. */
export function Shell({ game }: { game: GameState }) {
  const tab = useUiStore((store) => store.tab)
  const sheet = useUiStore((store) => store.sheet)
  const showDeceased = useUiStore((store) => store.showDeceased)
  const away = useGameStore((store) => store.away)
  const cloud = useGameStore((store) => store.cloud)

  const actions = loveActions(game)
  const net = familyRates(game).net
  const ended = livingMembers(game).length === 0
  const selectedId = sheet?.kind === 'member' ? sheet.memberId : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Hud game={game} net={net} />
      <NoticeBanner />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {tab === 'family' ? (
          ended ? (
            <FamilyEnded game={game} />
          ) : (
            <>
              <FamilyTree
                game={game}
                showDeceased={showDeceased}
                actions={nodeActions(actions, game.money)}
                selectedId={selectedId}
                onSelect={showMember}
              />
              <FamilyHint game={game} actions={actions} />
            </>
          )
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain">
            {tab === 'love' ? <LoveTab game={game} actions={actions} /> : null}
            {tab === 'history' ? <HistoryTab game={game} /> : null}
            {tab === 'settings' ? <SettingsTab game={game} /> : null}
          </div>
        )}
      </main>
      <BottomNav loveBadge={actions.ready} />
      <Toasts game={game} />
      {cloud.conflict && !cloud.conflictHidden ? (
        <ConflictSheet game={game} conflict={cloud.conflict} />
      ) : sheet ? (
        <SheetHost game={game} sheet={sheet} />
      ) : away ? (
        <AwaySheet game={game} away={away} />
      ) : null}
    </div>
  )
}

function SheetHost({ game, sheet }: { game: GameState; sheet: Sheet }) {
  switch (sheet.kind) {
    case 'member': {
      const member = game.members[sheet.memberId]
      return member ? <MemberSheet game={game} member={member} /> : null
    }
    case 'partner': {
      const member = game.members[sheet.memberId]
      return member ? <PartnerSheet game={game} member={member} /> : null
    }
    case 'rename':
      return <RenameSheet game={game} />
    case 'confirmNewFamily':
      return <ConfirmNewFamilySheet game={game} />
    case 'cloudLogin':
      return <CloudLoginSheet />
  }
}

function NoticeBanner() {
  const notice = useGameStore((store) => store.notice)
  const dismiss = useGameStore((store) => store.dismissNotice)
  if (!notice) return null
  return (
    <div className="border-line bg-gold-soft flex items-start gap-3 border-b px-4 py-2.5 text-[14px]">
      <p className="flex-1">{notice}</p>
      <button type="button" onClick={dismiss} className="text-gold font-bold">
        Entendi
      </button>
    </div>
  )
}

function FamilyEnded({ game }: { game: GameState }) {
  const openSetup = useGameStore((store) => store.openSetup)
  const members = Object.values(game.members)
  const generations = Math.max(...members.map((member) => member.generation)) + 1
  return (
    <div className="grid h-full place-items-center px-6">
      <div className="max-w-sm text-center">
        <p className="text-2xl font-extrabold">A família {game.familyName} chegou ao fim</p>
        <p className="text-ink-soft mt-2 text-[16px]">
          {generations === 1
            ? `Só os ${generationLabel(0).toLowerCase()} viveram esta história`
            : `Foram ${generations} gerações`}{' '}
          e {members.length} pessoas. Para a linhagem continuar, os filhos precisam casar e ter
          filhos.
        </p>
        <button type="button" className={`${button.primary} mt-5`} onClick={openSetup}>
          Começar outra família
        </button>
      </div>
    </div>
  )
}

/**
 * Dica para quem está começando: aparece até o primeiro filho e, depois, até
 * o primeiro casamento.
 */
function FamilyHint({ game, actions }: { game: GameState; actions: LoveActions }) {
  const members = Object.values(game.members)
  let hint: string | null = null
  if (!members.some((member) => member.origin === 'born')) {
    if (actions.couples.some((couple) => couple.check.ok)) {
      hint = 'Toque no círculo verde entre o casal para ter o primeiro filho.'
    }
  } else if (!members.some((member) => member.origin === 'married')) {
    hint =
      actions.seekers.length > 0
        ? 'Quem tem um coração já pode casar. Toque na pessoa para procurar um par.'
        : 'Aos 18 anos, os filhos podem casar e continuar a família.'
  }
  if (!hint) return null
  return (
    <p className="bg-surface/95 ring-line pointer-events-none absolute top-3 left-3 max-w-[calc(100%-5.5rem)] rounded-2xl px-3.5 py-2 text-[14px] font-semibold shadow-sm ring-1">
      {hint}
    </p>
  )
}
