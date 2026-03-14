import type { PhoneticResponse } from '../types/phonetics'

type FetchPhoneticOptions = {
    signal?: AbortSignal
}

export const fetchPhoneticSymbol = async (
    word: string,
    options?: FetchPhoneticOptions
): Promise<PhoneticResponse> => {
    const response = await fetch(`/api/phonetics?word=${encodeURIComponent(word)}`, {
        signal: options?.signal,
    })

    if (!response.ok) {
        throw new Error(`Phonetic lookup failed with status ${response.status}.`)
    }

    const payload = (await response.json()) as Partial<PhoneticResponse>

    if (typeof payload.ipa !== 'string') {
        throw new Error('Phonetic service returned an invalid payload.')
    }

    return {
        word: typeof payload.word === 'string' ? payload.word : word,
        ipa: payload.ipa,
    }
}
