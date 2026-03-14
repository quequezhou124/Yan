import type { PhoneticResponse } from '../types/phonetics'

type FetchPhoneticOptions = {
    signal?: AbortSignal
}

type WordLookupPayload = {
    words?: Array<{
        word?: string
        ipa?: string
    }>
}

const decodeUnicodeEscapes = (value: string): string => {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16))
    )
}

export const fetchPhoneticSymbol = async (
    word: string,
    options?: FetchPhoneticOptions
): Promise<PhoneticResponse> => {
    const response = await fetch(`/api/v1/words/${encodeURIComponent(word)}`, {
        signal: options?.signal,
    })

    if (!response.ok) {
        throw new Error(`Phonetic lookup failed with status ${response.status}.`)
    }

    const payload = (await response.json()) as WordLookupPayload
    const firstWord = payload.words?.[0]
    const ipaValue = firstWord?.ipa

    if (typeof ipaValue !== 'string') {
        throw new Error('Phonetic service returned an invalid payload.')
    }

    return {
        word: typeof firstWord?.word === 'string' ? firstWord.word : word,
        ipa: decodeUnicodeEscapes(ipaValue),
    }
}
