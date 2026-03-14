type ProgressHeaderProps = {
    current: number
    total: number
    canGoBack: boolean
    canGoNext: boolean
    onBack: () => void
    onNext: () => void
}

function ProgressHeader({
    current,
    total,
    canGoBack,
    canGoNext,
    onBack,
    onNext,
}: ProgressHeaderProps) {
    const safeTotal = total > 0 ? total : 1
    const boundedCurrent = Math.min(Math.max(current, 0), safeTotal - 1)
    const progressPercent = ((boundedCurrent + 1) / safeTotal) * 100

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
                    className="p2-progress-nav"
                    onClick={onNext}
                    disabled={!canGoNext}
                    aria-label="Go to next sentence"
                >
                    {'>'}
                </button>
            </div>
        </header>
    )
}

export default ProgressHeader
