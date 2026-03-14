import { tokenizeSentence } from './tokenize'

type CreateWordHighlighterOptions = {
  text: string
  onWordChange: (index: number | null) => void
  onComplete: () => void
}

export type HighlighterController = {
  start: () => void
  stop: () => void
  reset: () => void
  dispose: () => void
}

export function estimateSpeechTiming(text: string) {
  const tokens = tokenizeSentence(text).filter((token) => token.isWord)
  const wordCount = Math.max(tokens.length, 1)
  const rate = 0.95
  const totalDurationMs = Math.max(1800, wordCount * 420)

  return {
    rate,
    wordCount,
    totalDurationMs,
    intervalMs: totalDurationMs / wordCount,
  }
}

export function createWordHighlighter({
  text,
  onWordChange,
  onComplete,
}: CreateWordHighlighterOptions): HighlighterController {
  const tokens = tokenizeSentence(text)
  const wordTokenIndexes = tokens.reduce<number[]>((indexes, token, index) => {
    if (token.isWord) {
      indexes.push(index)
    }

    return indexes
  }, [])
  const timing = estimateSpeechTiming(text)
  let timerId: number | null = null
  let currentWord = 0

  function clearTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId)
      timerId = null
    }
  }

  return {
    start() {
      clearTimer()

      if (wordTokenIndexes.length === 0) {
        onWordChange(null)
        onComplete()
        return
      }

      onWordChange(wordTokenIndexes[0] ?? null)
      currentWord = 1

      timerId = window.setInterval(() => {
        if (currentWord >= wordTokenIndexes.length) {
          clearTimer()
          onComplete()
          return
        }

        onWordChange(wordTokenIndexes[currentWord] ?? null)
        currentWord += 1
      }, timing.intervalMs)
    },

    stop() {
      clearTimer()
    },

    reset() {
      clearTimer()
      currentWord = 0
      onWordChange(null)
    },

    dispose() {
      clearTimer()
    },
  }
}
