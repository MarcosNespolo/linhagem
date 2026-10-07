import type { PropertyId } from '@/content/properties'
import type { MemberId } from '@/engine'
import { useUiStore } from './ui-store'

/** Abre o painel de um membro. */
export function showMember(memberId: MemberId): void {
  useUiStore.getState().openSheet({ kind: 'member', memberId })
}

/** Abre a escolha do curso do próximo nível de um membro. */
export function showCourse(memberId: MemberId): void {
  useUiStore.getState().openSheet({ kind: 'course', memberId })
}

/** Abre a escolha da carreira nova de um membro, em que ele recomeça do zero. */
export function showCareer(memberId: MemberId): void {
  useUiStore.getState().openSheet({ kind: 'career', memberId })
}

/** Abre a escolha de onde a família mora, com os imóveis de moradia dela. */
export function showHomes(): void {
  useUiStore.getState().openSheet({ kind: 'homes' })
}

/** Abre o painel do imóvel tocado no bairro: aquele lote, com o que dá para fazer com ele. */
export function showLot(lot: { typeId: PropertyId; lot: number }): void {
  useUiStore.getState().openSheet({ kind: 'lot', propertyId: lot.typeId, lot: lot.lot })
}
