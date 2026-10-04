'use client'

import { useEffect } from 'react'
import { useGameStore } from './store'

const TICK_MS = 1_000
const SAVE_MS = 5_000

/**
 * Liga o relógio do jogo enquanto o componente estiver montado: carrega o
 * save, avança a cada segundo, grava a cada 5 s e sempre que a aba sai de
 * vista. Com a aba escondida o relógio não anda; ao voltar, o tempo fora é
 * simulado de uma vez, com o mesmo limite do progresso offline.
 */
export function useGameLoop(): void {
  useEffect(() => {
    const store = useGameStore.getState
    store().hydrate()

    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') store().tick()
    }, TICK_MS)
    const save = window.setInterval(() => store().persist(), SAVE_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') store().persist()
      else store().tick()
    }
    const onPageHide = () => store().persist()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(save)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      store().persist()
    }
  }, [])
}
