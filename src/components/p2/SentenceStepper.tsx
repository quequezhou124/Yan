type SentenceStepperProps = {
    canGoBack: boolean
    canGoNext: boolean
    onBack: () => void
    onNext: () => void
}

function SentenceStepper({
    canGoBack,
    canGoNext,
    onBack,
    onNext,
}: SentenceStepperProps) {
    return (
        <nav className="p2-stepper" aria-label="Sentence navigation">
            <button
                type="button"
                className="p2-step-button"
                onClick={onBack}
                disabled={!canGoBack}
                aria-label="Go to previous sentence"
            >
                Back
            </button>
            <button
                type="button"
                className="p2-step-button"
                onClick={onNext}
                disabled={!canGoNext}
                aria-label="Go to next sentence"
            >
                Next
            </button>
        </nav>
    )
}

export default SentenceStepper
