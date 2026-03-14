import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react'
import {
    computeWordBoundaries,
    splitSentenceWords,
} from '../../utils/sentenceWords'
import type {
    SentencePlayerBridgeApi,
    WordBoundaryEvent,
} from '../../types/tts'

type SentencePlayerBridgeProps = {
    wordDurationMs?: number
    onStart?: () => void
    onPause?: () => void
    onEnd?: () => void
    onWordBoundary?: (event: WordBoundaryEvent) => void
}

const DEFAULT_WORD_DURATION_MS = 500

const SentencePlayerBridge = forwardRef<
    SentencePlayerBridgeApi,
    SentencePlayerBridgeProps
>(function SentencePlayerBridge(
    {
        wordDurationMs = DEFAULT_WORD_DURATION_MS,
        onStart,
        onPause,
        onEnd,
        onWordBoundary,
    },
    ref
) {
    const timerRef = useRef<number | null>(null)
    const wordsRef = useRef<string[]>([])
    const boundariesRef = useRef<Array<{ start: number; end: number }>>([])
    const wordIndexRef = useRef(0)
    const isPlayingRef = useRef(false)

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const emitBoundary = useCallback(
        (wordIndex: number) => {
            const word = wordsRef.current[wordIndex]
            const boundary = boundariesRef.current[wordIndex]

            if (!word || !boundary) {
                return
            }

            onWordBoundary?.({
                word,
                wordIndex,
                charStart: boundary.start,
                charEnd: boundary.end,
            })
        },
        [onWordBoundary]
    )

    const stopInternal = useCallback(
        (emitEnd: boolean) => {
            clearTimer()
            isPlayingRef.current = false
            wordIndexRef.current = 0

            if (emitEnd) {
                onEnd?.()
            }
        },
        [clearTimer, onEnd]
    )

    const queueNextWord = useCallback(() => {
        clearTimer()

        if (!isPlayingRef.current) {
            return
        }

        if (wordIndexRef.current >= wordsRef.current.length) {
            stopInternal(true)
            return
        }

        emitBoundary(wordIndexRef.current)
        wordIndexRef.current += 1

        timerRef.current = window.setTimeout(queueNextWord, wordDurationMs)
    }, [clearTimer, emitBoundary, stopInternal, wordDurationMs])

    const speakSentence = useCallback(
        (text: string) => {
            const words = splitSentenceWords(text)

            clearTimer()
            wordsRef.current = words
            boundariesRef.current = computeWordBoundaries(text, words)
            wordIndexRef.current = 0

            if (words.length === 0) {
                isPlayingRef.current = false
                onEnd?.()
                return
            }

            isPlayingRef.current = true
            onStart?.()
            queueNextWord()
        },
        [clearTimer, onEnd, onStart, queueNextWord]
    )

    const speakWord = useCallback(
        (word: string) => {
            speakSentence(word)
        },
        [speakSentence]
    )

    const pause = useCallback(() => {
        if (!isPlayingRef.current) {
            return
        }

        isPlayingRef.current = false
        clearTimer()
        onPause?.()
    }, [clearTimer, onPause])

    const resume = useCallback(() => {
        if (isPlayingRef.current) {
            return
        }

        if (wordIndexRef.current >= wordsRef.current.length) {
            return
        }

        isPlayingRef.current = true
        onStart?.()
        queueNextWord()
    }, [onStart, queueNextWord])

    const stop = useCallback(() => {
        stopInternal(false)
    }, [stopInternal])

    useImperativeHandle(
        ref,
        () => ({
            speakSentence,
            speakWord,
            pause,
            resume,
            stop,
        }),
        [pause, resume, speakSentence, speakWord, stop]
    )

    useEffect(() => {
        return () => {
            clearTimer()
        }
    }, [clearTimer])

    return null
})

export default SentencePlayerBridge
