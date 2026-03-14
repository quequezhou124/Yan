import type { LearnedPronunciation } from '../../types/phonetics'

type CompletionPopupProps = {
    isOpen: boolean
    learnedPronunciations: LearnedPronunciation[]
    onContinue: () => void
}

function CompletionPopup({
    isOpen,
    learnedPronunciations,
    onContinue,
}: CompletionPopupProps) {
    if (!isOpen) {
        return null
    }

    return (
        <div className="p2-completion-backdrop" role="presentation">
            <section
                className="p2-completion-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Scene completion summary"
            >
                <h2 className="p2-completion-title">Congratulations!</h2>
                <p className="p2-completion-subtitle">
                    You completed this scene. Here is the pronunciation summary
                    from this lesson:
                </p>

                {learnedPronunciations.length > 0 ? (
                    <ul className="p2-completion-list">
                        {learnedPronunciations.map((entry) => (
                            <li key={`${entry.word}-${entry.ipa}`}>
                                <span>{entry.word}</span>
                                <strong>{entry.ipa}</strong>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p2-completion-empty">
                        No pronunciation words were tapped in this scene.
                    </p>
                )}

                <button
                    type="button"
                    className="p2-completion-continue"
                    onClick={onContinue}
                >
                    Continue
                </button>
            </section>
        </div>
    )
}

export default CompletionPopup
