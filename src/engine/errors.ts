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
  | 'dedicated'
  | 'choiceNotFound'
  | 'optionNotFound'
  | 'optionUnavailable'
  | 'notStudying'
  | 'invalidSchool'
  | 'noCourse'
  /** Largar o emprego para estudar: só quem trabalha, sem curso em andamento e sem escolha aberta. */
  | 'notWorking'
  | 'inCourse'
  | 'choiceOpen'
  | 'noJobOffer'
  | 'propertyNotFound'
  | 'propertyLocked'
  | 'soldOut'
  | 'lotNotForSale'
  /** As parcelas, com a nova, passariam do teto da renda da família. */
  | 'loanTooBig'
  | 'loanNotFound'
  | 'invalidDate'
  | 'alreadyDrawn'
  | 'missionNotFound'
  | 'missionNotDone'
  | 'alreadyClaimed'

export type Refusal = { ok: false; error: ActionError }

export function refuse(error: ActionError): Refusal {
  return { ok: false, error }
}
