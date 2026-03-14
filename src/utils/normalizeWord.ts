export const normalizeWord = (word: string): string => {
    return word
        .toLowerCase()
        .replace(/^[^a-z]+|[^a-z]+$/gi, '')
        .trim()
}
