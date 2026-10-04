'use client'

import { useEffect } from 'react'
import { useGameStore } from './store'

const TICK_MS = 1_000
const SAVE_MS = 5_000
const SYNC_MS = 30_000

/**
 * Liga o relógio do jogo enquanto o componente estiver montado: carrega o
 * save, avança a cada segundo, grava a cada 5 s e sempre que a aba sai de
 * vista. Com a aba escondida o relógio não anda; ao voltar, o tempo fora é
 * simulado de uma vez, com o mesmo limite do progresso offline.
 *
 * Com uma conta conectada, sincroniza com a nuvem ao abrir, a cada 30 s, ao
 * esconder a aba e ao voltar para ela.
 */
export function useGameLoop(): void {
  useEffect(() => {
    const store = useGameStore.getState
    store().hydrate()
    store().startCloud()

    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') store().tick()
    }, TICK_MS)
    const save = window.setInterval(() => store().persist(), SAVE_MS)
    const sync = window.setInterval(() => {
      if (document.visibilityState === 'visible') store().syncCloud()
    }, SYNC_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') store().persist()
      else store().tick()
      store().syncCloud()
    }
    const onPageHide = () => store().persist()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(save)
      window.clearInterval(sync)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      store().persist()
    }
  }, [])
}
