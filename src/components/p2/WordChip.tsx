import type { MouseEvent } from 'react'

type WordChipProps = {
    word: string
    wordIndex: number
    isActive: boolean
    isSelected: boolean
    onWordClick: (word: string, wordIndex: number, anchorRect: DOMRect) => void
}

function WordChip({
    word,
    wordIndex,
    isActive,
    isSelected,
    onWordClick,
}: WordChipProps) {
    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        const anchorRect = event.currentTarget.getBoundingClientRect()
        onWordClick(word, wordIndex, anchorRect)
    }

    return (
        <button
            type="button"
            className={[
                'p2-word-chip',
                isActive ? 'p2-word-active' : '',
                isSelected ? 'p2-word-selected' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={handleClick}
            aria-label={`Word ${wordIndex + 1}: ${word}. Play pronunciation.`}
            aria-pressed={isSelected}
        >
            {word}
        </button>
    )
}

export default WordChip
