type ProgressHeaderProps = {
    current: number
    total: number
    canGoBack: boolean
    canGoNext: boolean
    isLastSentence: boolean
    onBack: () => void
    onNext: () => void
    onComplete: () => void
}

function ProgressHeader({
    current,
    total,
    canGoBack,
    canGoNext,
    isLastSentence,
    onBack,
    onNext,
    onComplete,
}: ProgressHeaderProps) {
    const safeTotal = total > 0 ? total : 1
    const boundedCurrent = Math.min(Math.max(current, 0), safeTotal - 1)
    const progressPercent = ((boundedCurrent + 1) / safeTotal) * 100
    const shouldShowComplete = isLastSentence
    const nextAction = shouldShowComplete ? onComplete : onNext
    const isNextDisabled = shouldShowComplete ? false : !canGoNext

    return (
        <header className="p2-progress">
            <div className="p2-progress-meta">
                <span>Progress</span>
                <span>
                    {boundedCurrent + 1} / {safeTotal}
                </span>
            </div>
            <div className="p2-progress-row">
                <button
                    type="button"
                    className="p2-progress-nav"
                    onClick={onBack}
                    disabled={!canGoBack}
                    aria-label="Go to previous sentence"
                >
                    {'<'}
                </button>

                <div
                    className="p2-progress-track"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={safeTotal}
                    aria-valuenow={boundedCurrent + 1}
                    aria-label="Sentence progress"
                >
                    <div
                        className="p2-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <button
                    type="button"
                    className={
                        shouldShowComplete
                            ? 'p2-progress-nav p2-progress-nav-complete'
                            : 'p2-progress-nav'
                    }
                    onClick={nextAction}
                    disabled={isNextDisabled}
                    aria-label={
                        shouldShowComplete
                            ? 'Complete scene and open summary'
                            : 'Go to next sentence'
                    }
                >
                    {shouldShowComplete ? (
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            focusable="false"
                        >
                            <path
                                d="M5 12.5 L10 17.5 L19 7.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    ) : (
                        '>'
                    )}
                </button>
            </div>
        </header>
    )
}

export default ProgressHeader
