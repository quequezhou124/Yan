import { tokenizeSentence } from '../utils/tokenize'

type SentenceDisplayProps = {
  sentence: string
  translation: string
  activeWordIndex: number | null
}

export function SentenceDisplay({
  sentence,
  translation,
  activeWordIndex,
}: SentenceDisplayProps) {
  const tokens = tokenizeSentence(sentence)

  return (
    <div className="sentence-display">
      <p className="sentence-label">Current sentence</p>

      <div className="sentence-line" aria-live="polite">
        {tokens.map((token, index) => (
          <span
            key={`${token.value}-${index}`}
            className={
              token.isWord
                ? `word-chip${activeWordIndex === index ? ' word-chip--active' : ''}`
                : 'word-chip word-chip--plain'
            }
          >
            {token.value}
          </span>
        ))}
      </div>

      <p className="translation-label">Translation</p>
      <p className="translation-line">{translation}</p>
    </div>
  )
}
