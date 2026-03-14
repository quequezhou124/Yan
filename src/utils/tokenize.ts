export type Token = {
  value: string
  isWord: boolean
}

const WORD_PATTERN = /(\s+|[^\w']+|[\w']+)/g

export function tokenizeSentence(sentence: string): Token[] {
  const matches = sentence.match(WORD_PATTERN) ?? []

  return matches.map((value) => ({
    value,
    isWord: /[\w']/.test(value),
  }))
}
