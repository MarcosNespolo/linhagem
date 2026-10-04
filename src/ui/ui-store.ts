import { create } from 'zustand'
import type { MemberId } from '@/engine'

/** Abas da barra de baixo, mais Ajustes, que abre pela engrenagem do topo. */
export type Tab = 'family' | 'love' | 'studies' | 'work' | 'settings'

/** O que a aba Família mostra: a árvore ou o histórico. */
export type FamilyView = 'tree' | 'history'

export type Sheet =
  | { kind: 'member'; memberId: MemberId }
  | { kind: 'partner'; memberId: MemberId }
  | { kind: 'rename' }
  | { kind: 'confirmNewFamily' }
  | { kind: 'cloudLogin' }

type UiStore = {
  tab: Tab
  familyView: FamilyView
  sheet: Sheet | null
  /** Mostrar na árvore quem já faleceu e não deixou descendentes vivos. */
  showDeceased: boolean
  /**
   * Escolhas que o jogador fechou para decidir depois, pela chave de
   * `choicesKey`. Uma escolha nova muda a chave e o painel volta a abrir.
   */
  hiddenChoices: string | null
  setTab: (tab: Tab) => void
  setFamilyView: (view: FamilyView) => void
  openSheet: (sheet: Sheet) => void
  closeSheet: () => void
  setShowDeceased: (value: boolean) => void
  hideChoices: (key: string) => void
  /** Fecha o painel aberto e mostra as escolhas que esperam o jogador. */
  showChoices: () => void
}

const PREFS_KEY = 'linhagem:prefs'

type Prefs = { showDeceased: boolean }

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {}
    return { showDeceased: parsed.showDeceased === true }
  } catch {
    return { showDeceased: false }
  }
}

function writePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Preferência de exibição: se não der para guardar, vale só nesta sessão.
  }
}

/** Estado da interface: aba aberta, painel aberto e preferências de exibição. */
export const useUiStore = create<UiStore>()((set) => ({
  tab: 'family',
  familyView: 'tree',
  sheet: null,
  showDeceased: false,
  hiddenChoices: null,
  setTab: (tab) => set({ tab, sheet: null }),
  setFamilyView: (familyView) => set({ familyView }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  setShowDeceased: (showDeceased) => {
    writePrefs({ showDeceased })
    set({ showDeceased })
  },
  hideChoices: (key) => set({ hiddenChoices: key }),
  showChoices: () => set({ sheet: null, hiddenChoices: null }),
}))

/** Lê as preferências guardadas. Chamado uma vez, no navegador. */
export function loadUiPrefs(): void {
  useUiStore.setState(readPrefs())
}
