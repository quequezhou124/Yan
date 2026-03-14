import { useCallback, useRef, useState } from 'react'
import { fetchPhoneticSymbol } from '../services/phoneticsService'
import { normalizeWord } from '../utils/normalizeWord'

const PHONETIC_TIMEOUT_MS = 6000

type UsePhoneticLookupResult = {
    phoneticSymbol: string | null
    isPhoneticLoading: boolean
    phoneticError: string | null
    lookupPhonetic: (word: string) => Promise<void>
    clearPhonetic: () => void
}

function usePhoneticLookup(): UsePhoneticLookupResult {
    const cacheRef = useRef(new Map<string, string>())
    const requestIdRef = useRef(0)
    const inflightWordRef = useRef<string | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const timeoutIdRef = useRef<number | null>(null)

    const [phoneticSymbol, setPhoneticSymbol] = useState<string | null>(null)
    const [isPhoneticLoading, setIsPhoneticLoading] = useState(false)
    const [phoneticError, setPhoneticError] = useState<string | null>(null)

    const lookupPhonetic = useCallback(async (word: string) => {
        const normalizedWord = normalizeWord(word)

        if (!normalizedWord) {
            setPhoneticSymbol(null)
            setPhoneticError('No valid word selected.')
            setIsPhoneticLoading(false)
            return
        }

        const cachedSymbol = cacheRef.current.get(normalizedWord)

        if (cachedSymbol) {
            setPhoneticSymbol(cachedSymbol)
            setPhoneticError(null)
            setIsPhoneticLoading(false)
            return
        }

        if (inflightWordRef.current === normalizedWord) {
            return
        }

        const requestId = requestIdRef.current + 1
        requestIdRef.current = requestId
        inflightWordRef.current = normalizedWord
        abortControllerRef.current?.abort()
        if (timeoutIdRef.current !== null) {
            window.clearTimeout(timeoutIdRef.current)
        }

        const abortController = new AbortController()
        abortControllerRef.current = abortController
        timeoutIdRef.current = window.setTimeout(() => {
            abortController.abort()
        }, PHONETIC_TIMEOUT_MS)

        setIsPhoneticLoading(true)
        setPhoneticError(null)
        setPhoneticSymbol(null)

        try {
            const response = await fetchPhoneticSymbol(normalizedWord, {
                signal: abortController.signal,
            })

            if (requestId !== requestIdRef.current) {
                return
            }

            cacheRef.current.set(normalizedWord, response.ipa)
            setPhoneticSymbol(response.ipa)
            setPhoneticError(null)
        } catch (error) {
            if (requestId !== requestIdRef.current) {
                return
            }

            if (error instanceof Error && error.name === 'AbortError') {
                setPhoneticError(
                    'Pronunciation request timed out. Please tap again.'
                )
                setPhoneticSymbol(null)
                return
            }

            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to load phonetic symbol.'
            setPhoneticError(message)
            setPhoneticSymbol(null)
        } finally {
            if (requestId === requestIdRef.current) {
                setIsPhoneticLoading(false)
                inflightWordRef.current = null
                abortControllerRef.current = null
            }

            if (timeoutIdRef.current !== null) {
                window.clearTimeout(timeoutIdRef.current)
                timeoutIdRef.current = null
            }
        }
    }, [])

    const clearPhonetic = useCallback(() => {
        requestIdRef.current += 1
        inflightWordRef.current = null
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
        if (timeoutIdRef.current !== null) {
            window.clearTimeout(timeoutIdRef.current)
            timeoutIdRef.current = null
        }
        setIsPhoneticLoading(false)
        setPhoneticError(null)
        setPhoneticSymbol(null)
    }, [])

    return {
        phoneticSymbol,
        isPhoneticLoading,
        phoneticError,
        lookupPhonetic,
        clearPhonetic,
    }
}

export default usePhoneticLookup
