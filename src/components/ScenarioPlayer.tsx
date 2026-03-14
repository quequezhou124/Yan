import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScenarioData } from '../types/scenario'
import { PlaybackControls } from './PlaybackControls'
import { SentenceDisplay } from './SentenceDisplay'
import { createWordHighlighter, type HighlighterController } from '../utils/speechSync'
import {
  createTtsPlayer,
  type PlaybackState,
  type TtsEngine,
  type TtsPlayer,
} from '../services/ttsService'

type ScenarioPlayerProps = {
  scenario: ScenarioData
}

export function ScenarioPlayer({ scenario }: ScenarioPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null)
  const [autoPlay, setAutoPlay] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>('browser')

  const playerRef = useRef<TtsPlayer | null>(null)
  const highlighterRef = useRef<HighlighterController | null>(null)
  const currentIndexRef = useRef(currentIndex)

  const sentence = scenario.sentences[currentIndex] ?? ''
  const translation = scenario.translations[currentIndex] ?? ''
  const totalSentences = scenario.sentences.length

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < totalSentences - 1

  const statusLabel = useMemo(() => {
    if (isLoading) {
      return 'loading'
    }

    if (errorMessage) {
      return 'error'
    }

    return playbackState
  }, [errorMessage, isLoading, playbackState])

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  useEffect(() => {
    const player = createTtsPlayer({
      onStateChange: (nextState) => {
        setPlaybackState(nextState)

        if (nextState !== 'playing') {
          setIsLoading(false)
        }

        if (nextState === 'idle' || nextState === 'finished') {
          highlighterRef.current?.stop()
          setActiveWordIndex(null)
        }
      },
      onError: (message) => {
        setErrorMessage(message)
        setIsLoading(false)
        setTtsEngine('error')
      },
      onPlaybackStart: () => {
        setErrorMessage(null)
        setIsLoading(false)
        highlighterRef.current?.start()
      },
      onPlaybackEnd: () => {
        highlighterRef.current?.stop()
        setActiveWordIndex(null)

        if (autoPlay && currentIndexRef.current < totalSentences - 1) {
          const nextIndex = currentIndexRef.current + 1
          setCurrentIndex(nextIndex)
        }
      },
      onEngineChange: setTtsEngine,
    })

    playerRef.current = player

    return () => {
      highlighterRef.current?.dispose()
      player.dispose()
      playerRef.current = null
    }
  }, [autoPlay, totalSentences])

  useEffect(() => {
    const highlighter = createWordHighlighter({
      text: sentence,
      onWordChange: setActiveWordIndex,
      onComplete: () => setActiveWordIndex(null),
    })

    highlighterRef.current?.dispose()
    highlighterRef.current = highlighter
    setActiveWordIndex(null)
    setErrorMessage(null)
    setIsLoading(false)

    playerRef.current?.stop()

    return () => {
      highlighter.dispose()
    }
  }, [sentence])

  useEffect(() => {
    if (!autoPlay) {
      return
    }

    if (playbackState !== 'finished') {
      return
    }

    if (currentIndex === 0 || !sentence) {
      return
    }

    void handlePlay()
    // `sentence` changes whenever `currentIndex` advances, which is the replay trigger we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, currentIndex, playbackState, sentence])

  async function handlePlay() {
    if (!sentence) {
      return
    }

    setErrorMessage(null)
    setIsLoading(true)
    setActiveWordIndex(null)

    highlighterRef.current?.reset()

    try {
      await playerRef.current?.play(sentence)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to play the sentence.'

      setErrorMessage(message)
      setIsLoading(false)
    }
  }

  function handlePause() {
    playerRef.current?.pause()
    highlighterRef.current?.stop()
  }

  function handleReplay() {
    playerRef.current?.stop()
    setPlaybackState('idle')
    void handlePlay()
  }

  function handlePrevious() {
    if (!canGoPrevious) {
      return
    }

    setCurrentIndex((index) => index - 1)
  }

  function handleNext() {
    if (!canGoNext) {
      return
    }

    setCurrentIndex((index) => index + 1)
  }

  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">Page 2 MVP</p>
        <h1>{scenario.title}</h1>
        <p className="page-subtitle">
          Practice listening to NPC dialogue with word-by-word subtitle sync.
        </p>
      </section>

      <section className="scenario-layout">
        <article className="sentence-card">
          <div className="sentence-card__meta">
            <span className="progress-pill">
              {currentIndex + 1} / {totalSentences}
            </span>
            <div className="meta-pill-group">
              <span className={`engine-pill engine-pill--${ttsEngine}`}>
                {ttsEngine === 'provider'
                  ? 'Provider TTS'
                  : ttsEngine === 'browser'
                    ? 'Browser TTS'
                    : 'Error'}
              </span>
              <span className={`status-pill status-pill--${statusLabel}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          <SentenceDisplay
            sentence={sentence}
            translation={translation}
            activeWordIndex={activeWordIndex}
          />

          {errorMessage ? <p className="feedback error">{errorMessage}</p> : null}
          {!errorMessage && isLoading ? (
            <p className="feedback">Preparing speech...</p>
          ) : null}
        </article>

        <aside className="controls-card">
          <PlaybackControls
            playbackState={playbackState}
            autoPlay={autoPlay}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            isBusy={isLoading}
            onPlay={handlePlay}
            onPause={handlePause}
            onReplay={handleReplay}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onAutoPlayChange={setAutoPlay}
          />
        </aside>
      </section>
    </main>
  )
}
