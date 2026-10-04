/** Motivos para a engine recusar uma ação do jogador. */
export type ActionError =
  | 'memberNotFound'
  | 'memberDeceased'
  | 'noPartner'
  | 'tooYoung'
  | 'tooOld'
  | 'cooldown'
  | 'notEnoughMoney'
  | 'invalidName'
  | 'alreadyMarried'
  | 'suitorNotFound'
  | 'choiceNotFound'
  | 'optionNotFound'
  | 'optionUnavailable'
  | 'notStudying'
  | 'invalidSchool'
  | 'noCourse'
  | 'propertyNotFound'
  | 'propertyLocked'

export type Refusal = { ok: false; error: ActionError }

export function refuse(error: ActionError): Refusal {
  return { ok: false, error }
}
