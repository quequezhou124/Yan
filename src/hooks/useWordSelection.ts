import { useCallback, useState } from 'react'

type WordSelectionState = {
    word: string | null
    wordIndex: number | null
    anchorRect: DOMRect | null
}

type SelectWordParams = {
    word: string
    wordIndex: number
    anchorRect: DOMRect
}

type UseWordSelectionResult = {
    selectedWord: string | null
    selectedWordIndex: number | null
    selectedWordRect: DOMRect | null
    selectWord: (params: SelectWordParams) => void
    clearSelection: () => void
}

const INITIAL_STATE: WordSelectionState = {
    word: null,
    wordIndex: null,
    anchorRect: null,
}

function useWordSelection(): UseWordSelectionResult {
    const [selection, setSelection] = useState<WordSelectionState>(INITIAL_STATE)

    const selectWord = useCallback((params: SelectWordParams) => {
        setSelection({
            word: params.word,
            wordIndex: params.wordIndex,
            anchorRect: params.anchorRect,
        })
    }, [])

    const clearSelection = useCallback(() => {
        setSelection(INITIAL_STATE)
    }, [])

    return {
        selectedWord: selection.word,
        selectedWordIndex: selection.wordIndex,
        selectedWordRect: selection.anchorRect,
        selectWord,
        clearSelection,
    }
}

export default useWordSelection
