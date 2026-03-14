export type WordBoundaryRange = {
    start: number
    end: number
}

export const splitSentenceWords = (sentence: string): string[] => {
    const trimmed = sentence.trim()

    if (!trimmed) {
        return []
    }

    return trimmed.split(/\s+/)
}

export const computeWordBoundaries = (
    sentence: string,
    words: string[]
): WordBoundaryRange[] => {
    let cursor = 0

    return words.map((word) => {
        const start = sentence.indexOf(word, cursor)

        if (start < 0) {
            const fallbackStart = Math.max(cursor, 0)
            const fallbackEnd = fallbackStart + word.length
            cursor = fallbackEnd
            return {
                start: fallbackStart,
                end: fallbackEnd,
            }
        }

        const end = start + word.length
        cursor = end

        return {
            start,
            end,
        }
    })
}
