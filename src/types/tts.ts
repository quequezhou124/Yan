export type WordBoundaryEvent = {
    word: string
    wordIndex: number
    charStart: number
    charEnd: number
}

export type PronunciationCue = {
    targetLetters: string[]
}

export type SentencePlayerBridgeApi = {
    speakSentence: (text: string) => void
    speakWord: (word: string) => void
    pause: () => void
    resume: () => void
    stop: () => void
}
