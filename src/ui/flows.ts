import type { MemberId } from '@/engine'
import { useGameStore } from '@/game/store'
import { useUiStore } from './ui-store'

/** Abre a escolha de par, sorteando as pessoas sugeridas na primeira vez. */
export function seekPartner(memberId: MemberId): void {
  const { game, dispatch } = useGameStore.getState()
  if (game && !game.suitors[memberId]) dispatch({ type: 'findSuitors', memberId })
  useUiStore.getState().openSheet({ kind: 'partner', memberId })
}

/** Abre o painel de um membro. */
export function showMember(memberId: MemberId): void {
  useUiStore.getState().openSheet({ kind: 'member', memberId })
}
