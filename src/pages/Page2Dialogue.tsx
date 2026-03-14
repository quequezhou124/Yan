import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import OverlayCard from '../components/p2/OverlayCard'
import PhoneticPopup from '../components/p2/PhoneticPopup'
import PlaybackControls from '../components/p2/PlaybackControls'
import ProgressHeader from '../components/p2/ProgressHeader'
import SceneCanvas from '../components/p2/SceneCanvas'
import SentenceLine from '../components/p2/SentenceLine'
import TranslationToggle from '../components/p2/TranslationToggle'
import SentencePlayerBridge from '../components/tts/SentencePlayerBridge'
import { resolveSceneBackground } from '../config/sceneBackgrounds'
import usePhoneticLookup from '../hooks/usePhoneticLookup'
import useSentencePlayback from '../hooks/useSentencePlayback'
import useWordSelection from '../hooks/useWordSelection'
import type { P2Payload, Page2RouteState } from '../types/dialogue'
import type { SentencePlayerBridgeApi } from '../types/tts'
import '../styles/p2.css'

const FALLBACK_PAYLOAD: P2Payload = {
    sentences: ['Welcome. Page 2 data was not passed from Page 1.'],
    translations: ['欢迎。第一页没有传递第二页数据。'],
}

function Page2Dialogue() {
    const { sceneId: sceneIdParam } = useParams()
    const location = useLocation()
    const [sentenceIndex, setSentenceIndex] = useState(0)
    const [showTranslation, setShowTranslation] = useState(true)
    const bridgeRef = useRef<SentencePlayerBridgeApi | null>(null)

    const {
        selectedWord,
        selectedWordIndex,
        selectedWordRect,
        selectWord,
        clearSelection,
    } = useWordSelection()
    const {
        phoneticSymbol,
        isPhoneticLoading,
        phoneticError,
        lookupPhonetic,
        clearPhonetic,
    } = usePhoneticLookup()

    const sceneId = Number.parseInt(sceneIdParam ?? '', 10)
    const routeState = (location.state ?? {}) as Page2RouteState
    const payload = routeState.p2 ?? FALLBACK_PAYLOAD
    const normalizedSentences =
        payload.sentences.length > 0
            ? payload.sentences
            : FALLBACK_PAYLOAD.sentences
    const normalizedTranslations = Array.isArray(payload.translations)
        ? payload.translations
        : []
    const safeSentenceCount = Math.max(normalizedSentences.length, 1)
    const currentSentenceIndex = Math.min(sentenceIndex, safeSentenceCount - 1)

    const sentence = normalizedSentences[currentSentenceIndex] ?? ''
    const translation = normalizedTranslations[currentSentenceIndex]
    const isTranslationMissing = typeof translation !== 'string'
    const hasLengthMismatch =
        normalizedSentences.length !== normalizedTranslations.length
    const backgroundImageUrl = resolveSceneBackground(
        Number.isNaN(sceneId) ? -1 : sceneId,
        routeState.customBackgroundUrl
    )
    const canGoBack = currentSentenceIndex > 0
    const canGoNext = currentSentenceIndex < safeSentenceCount - 1

    const {
        isPlaying,
        activeWordIndex,
        handlePlayPause,
        stopPlayback,
        speakWordAtIndex,
        bridgeCallbacks,
    } = useSentencePlayback({
        sentence,
        bridgeRef,
    })

    const clearWordDetails = useCallback(() => {
        clearSelection()
        clearPhonetic()
    }, [clearPhonetic, clearSelection])

    const handleBack = () => {
        stopPlayback()
        clearWordDetails()
        setSentenceIndex((previous) => Math.max(previous - 1, 0))
    }

    const handleNext = () => {
        stopPlayback()
        clearWordDetails()
        setSentenceIndex((previous) =>
            Math.min(previous + 1, safeSentenceCount - 1)
        )
    }

    const handleWordClick = (
        word: string,
        wordIndex: number,
        anchorRect: DOMRect
    ) => {
        selectWord({
            word,
            wordIndex,
            anchorRect,
        })
        speakWordAtIndex(word, wordIndex)
        void lookupPhonetic(word)
    }

    useEffect(() => {
        if (!selectedWord) {
            return
        }

        const handleOutsideTap = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null

            if (!target) {
                return
            }

            if (
                target.closest('.p2-word-chip') ||
                target.closest('.p2-phonetic-popup')
            ) {
                return
            }

            clearWordDetails()
        }

        document.addEventListener('pointerdown', handleOutsideTap)

        return () => {
            document.removeEventListener('pointerdown', handleOutsideTap)
        }
    }, [clearWordDetails, selectedWord])

    useEffect(() => {
        if (!selectedWord) {
            return
        }

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                clearWordDetails()
            }
        }

        document.addEventListener('keydown', handleEscapeKey)

        return () => {
            document.removeEventListener('keydown', handleEscapeKey)
        }
    }, [clearWordDetails, selectedWord])

    return (
        <main className="p2-page" aria-label="Dialogue practice page">
            <SceneCanvas imageUrl={backgroundImageUrl} />
            <SentencePlayerBridge ref={bridgeRef} {...bridgeCallbacks} />
            <Link to="/" className="p2-scene-back-link" aria-label="Back to page 1">
                <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    focusable="false"
                >
                    <path
                        d="M14.5 5.5 L8 12 L14.5 18.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </Link>

            <div className="p2-content" role="region" aria-label="Sentence card">
                <OverlayCard>
                    <ProgressHeader
                        current={currentSentenceIndex}
                        total={safeSentenceCount}
                        canGoBack={canGoBack}
                        canGoNext={canGoNext}
                        onBack={handleBack}
                        onNext={handleNext}
                    />

                    <div className="p2-sentence-row">
                        <PlaybackControls
                            isPlaying={isPlaying}
                            onPlayPause={handlePlayPause}
                        />
                        <SentenceLine
                            sentence={sentence}
                            activeWordIndex={activeWordIndex}
                            selectedWordIndex={selectedWordIndex}
                            onWordClick={handleWordClick}
                        />
                        <TranslationToggle
                            enabled={showTranslation}
                            onToggle={() => setShowTranslation((value) => !value)}
                        />
                    </div>

                    {showTranslation ? (
                        <p className="p2-translation">
                            {isTranslationMissing
                                ? 'Translation unavailable for this sentence.'
                                : translation}
                        </p>
                    ) : null}

                    {hasLengthMismatch ? (
                        <p className="p2-translation-warning" role="status">
                            Translation list length does not match sentence count.
                        </p>
                    ) : null}
                </OverlayCard>
            </div>

            <PhoneticPopup
                anchorRect={selectedWordRect}
                word={selectedWord}
                ipa={phoneticSymbol}
                loading={isPhoneticLoading}
                error={phoneticError}
                onClose={clearWordDetails}
            />
        </main>
    )
}

export default Page2Dialogue
