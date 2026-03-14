import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRef } from 'react'
import type { RefObject } from 'react'
import type {
    SentencePlayerBridgeApi,
    WordBoundaryEvent,
} from '../types/tts'

type UseSentencePlaybackParams = {
    sentence: string
    bridgeRef: RefObject<SentencePlayerBridgeApi | null>
}

type UseSentencePlaybackResult = {
    isPlaying: boolean
    activeWordIndex: number | null
    handlePlayPause: () => void
    stopPlayback: () => void
    speakWordAtIndex: (word: string, wordIndex: number) => void
    bridgeCallbacks: {
        onStart: () => void
        onPause: () => void
        onEnd: () => void
        onWordBoundary: (event: WordBoundaryEvent) => void
    }
}

function useSentencePlayback({
    sentence,
    bridgeRef,
}: UseSentencePlaybackParams): UseSentencePlaybackResult {
    const [isPlaying, setIsPlaying] = useState(false)
    const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null)
    const playbackModeRef = useRef<'sentence' | 'word' | null>(null)
    const selectedWordIndexRef = useRef<number | null>(null)

    const handleStart = useCallback(() => {
        setIsPlaying(true)
    }, [])

    const handlePause = useCallback(() => {
        setIsPlaying(false)
    }, [])

    const handleEnd = useCallback(() => {
        playbackModeRef.current = null
        selectedWordIndexRef.current = null
        setIsPlaying(false)
        setActiveWordIndex(null)
    }, [])

    const handleWordBoundary = useCallback((event: WordBoundaryEvent) => {
        if (playbackModeRef.current === 'word') {
            setActiveWordIndex(selectedWordIndexRef.current)
            return
        }

        setActiveWordIndex(event.wordIndex)
    }, [])

    const stopPlayback = useCallback(() => {
        bridgeRef.current?.stop()
        playbackModeRef.current = null
        selectedWordIndexRef.current = null
        setIsPlaying(false)
        setActiveWordIndex(null)
    }, [bridgeRef])

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            bridgeRef.current?.pause()
            return
        }

        if (activeWordIndex === null) {
            playbackModeRef.current = 'sentence'
            selectedWordIndexRef.current = null
            bridgeRef.current?.speakSentence(sentence)
            return
        }

        bridgeRef.current?.resume()
    }, [activeWordIndex, bridgeRef, isPlaying, sentence])

    useEffect(() => {
        stopPlayback()
    }, [sentence, stopPlayback])

    const speakWordAtIndex = useCallback(
        (word: string, wordIndex: number) => {
            bridgeRef.current?.stop()
            playbackModeRef.current = 'word'
            selectedWordIndexRef.current = wordIndex
            setActiveWordIndex(wordIndex)
            setIsPlaying(true)
            bridgeRef.current?.speakWord(word)
        },
        [bridgeRef]
    )

    const bridgeCallbacks = useMemo(
        () => ({
            onStart: handleStart,
            onPause: handlePause,
            onEnd: handleEnd,
            onWordBoundary: handleWordBoundary,
        }),
        [handleEnd, handlePause, handleStart, handleWordBoundary]
    )

    return {
        isPlaying,
        activeWordIndex,
        handlePlayPause,
        stopPlayback,
        speakWordAtIndex,
        bridgeCallbacks,
    }
}

export default useSentencePlayback
