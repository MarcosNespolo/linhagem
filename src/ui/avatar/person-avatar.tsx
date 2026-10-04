import { ageInYears, type Appearance, type Gender } from '@/engine'
import { Avatar } from './avatar'
import { avatarLook } from './look'

type Person = {
  appearance: Appearance
  gender: Gender
  avatarSeed: string
  birthDay: number
  deathDay?: number | null
}

type Props = {
  person: Person
  day: number
  size: number
  className?: string
}

/** Avatar de um membro ou de uma pessoa sugerida como par, na idade do dia informado. */
export function PersonAvatar({ person, day, size, className }: Props) {
  const age = ageInYears(person.birthDay, person.deathDay ?? day)
  const look = avatarLook(person.appearance, person.gender, age, person.avatarSeed)
  return <Avatar look={look} size={size} className={className} />
}
