import { splitSentenceWords } from '../../utils/sentenceWords'
import WordChip from './WordChip'

type SentenceLineProps = {
    sentence: string
    activeWordIndex: number | null
    selectedWordIndex: number | null
    onWordClick: (word: string, wordIndex: number, anchorRect: DOMRect) => void
}

function SentenceLine({
    sentence,
    activeWordIndex,
    selectedWordIndex,
    onWordClick,
}: SentenceLineProps) {
    const words = splitSentenceWords(sentence)

    if (words.length === 0) {
        return <h2 className="p2-sentence">{sentence}</h2>
    }

    return (
        <h2
            className="p2-sentence"
            aria-live="polite"
            aria-label="English sentence. Tap any word to hear pronunciation."
        >
            {words.map((word, index) => (
                <WordChip
                    key={`${word}-${index}`}
                    word={word}
                    wordIndex={index}
                    isActive={index === activeWordIndex}
                    isSelected={index === selectedWordIndex}
                    onWordClick={onWordClick}
                />
            ))}
        </h2>
    )
}

export default SentenceLine
