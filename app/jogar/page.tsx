import type { Metadata } from 'next'
import { Game } from '@/ui/game'

export const metadata: Metadata = { title: 'Jogar' }

export default function PlayPage() {
  return <Game />
}
