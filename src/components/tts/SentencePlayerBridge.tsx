import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react'
import { createTtsPlayer } from '../../services/ttsService'
import type { TtsPlayer } from '../../services/ttsService'
import { createWordHighlighter } from '../../utils/speechSync'
import type { HighlighterController } from '../../utils/speechSync'
import { tokenizeSentence } from '../../utils/tokenize'
import {
    computeWordBoundaries,
    splitSentenceWords,
} from '../../utils/sentenceWords'
import type {
    SentencePlayerBridgeApi,
    WordBoundaryEvent,
} from '../../types/tts'

type SentencePlayerBridgeProps = {
    onStart?: () => void
    onPause?: () => void
    onEnd?: () => void
    onWordBoundary?: (event: WordBoundaryEvent) => void
}

const SentencePlayerBridge = forwardRef<
    SentencePlayerBridgeApi,
    SentencePlayerBridgeProps
>(function SentencePlayerBridge({ onStart, onPause, onEnd, onWordBoundary }, ref) {
    const playerRef = useRef<TtsPlayer | null>(null)
    const highlighterRef = useRef<HighlighterController | null>(null)
    const currentTextRef = useRef('')
    const wordsRef = useRef<string[]>([])
    const boundariesRef = useRef<Array<{ start: number; end: number }>>([])
    const tokenWordMapRef = useRef(new Map<number, number>())

    const disposeHighlighter = useCallback(() => {
        highlighterRef.current?.dispose()
        highlighterRef.current = null
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

    const setupSpeechSync = useCallback(
        (text: string) => {
            const tokens = tokenizeSentence(text)
            const tokenWordMap = new Map<number, number>()
            let runningWordIndex = 0

            tokens.forEach((token, tokenIndex) => {
                if (!token.isWord) {
                    return
                }

                tokenWordMap.set(tokenIndex, runningWordIndex)
                runningWordIndex += 1
            })

            tokenWordMapRef.current = tokenWordMap
            wordsRef.current = splitSentenceWords(text)
            boundariesRef.current = computeWordBoundaries(text, wordsRef.current)

            disposeHighlighter()
            highlighterRef.current = createWordHighlighter({
                text,
                onWordChange: (tokenIndex) => {
                    if (tokenIndex === null) {
                        return
                    }

                    const mappedWordIndex = tokenWordMapRef.current.get(tokenIndex)

                    if (mappedWordIndex === undefined) {
                        return
                    }

                    emitBoundary(mappedWordIndex)
                },
                onComplete: () => {
                    // Playback end events are forwarded from the TTS player callbacks.
                },
            })
        },
        [disposeHighlighter, emitBoundary]
    )

    const playText = useCallback(
        (text: string) => {
            const nextText = text.trim()

            if (!nextText) {
                onEnd?.()
                return
            }

            currentTextRef.current = nextText
            setupSpeechSync(nextText)
            void playerRef.current?.play(nextText)
        },
        [onEnd, setupSpeechSync]
    )

    const speakSentence = useCallback(
        (text: string) => {
            playText(text)
        },
        [playText]
    )

    const speakWord = useCallback(
        (word: string) => {
            playText(word)
        },
        [playText]
    )

    const pause = useCallback(() => {
        highlighterRef.current?.stop()
        playerRef.current?.pause()
        onPause?.()
    }, [onPause])

    const resume = useCallback(() => {
        if (!currentTextRef.current) {
            return
        }

        playText(currentTextRef.current)
    }, [playText])

    const stop = useCallback(() => {
        highlighterRef.current?.reset()
        highlighterRef.current?.stop()
        playerRef.current?.stop()
    }, [])

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
        const player = createTtsPlayer({
            onStateChange: (state) => {
                if (state === 'paused') {
                    highlighterRef.current?.stop()
                }
            },
            onError: () => {
                highlighterRef.current?.stop()
                onEnd?.()
            },
            onPlaybackStart: () => {
                highlighterRef.current?.reset()
                highlighterRef.current?.start()
                onStart?.()
            },
            onPlaybackEnd: () => {
                highlighterRef.current?.stop()
                onEnd?.()
            },
            onEngineChange: () => {
                // No UI branching needed for engine type in Page 2.
            },
        })

        playerRef.current = player

        return () => {
            disposeHighlighter()
            player.dispose()
            playerRef.current = null
        }
    }, [disposeHighlighter, onEnd, onStart])

    return null
})

export default SentencePlayerBridge
