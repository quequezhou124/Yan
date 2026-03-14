import { useId } from 'react'

type PhoneticPopupProps = {
    anchorRect: DOMRect | null
    word: string | null
    ipa: string | null
    loading: boolean
    error: string | null
    onClose: () => void
}

const POPUP_HALF_WIDTH = 150
const POPUP_MARGIN = 12

function PhoneticPopup({
    anchorRect,
    word,
    ipa,
    loading,
    error,
    onClose,
}: PhoneticPopupProps) {
    const headingId = useId()
    const bodyId = useId()

    if (!anchorRect || !word) {
        return null
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const targetLeft = anchorRect.left + anchorRect.width / 2
    const clampedLeft = Math.min(
        Math.max(targetLeft, POPUP_HALF_WIDTH + POPUP_MARGIN),
        viewportWidth - POPUP_HALF_WIDTH - POPUP_MARGIN
    )
    const targetTop = anchorRect.top - 8
    const clampedTop = Math.max(targetTop, POPUP_MARGIN)

    return (
        <div
            className="p2-phonetic-popup"
            style={{
                left: `${clampedLeft}px`,
                top: `${clampedTop}px`,
                maxHeight: `${Math.max(viewportHeight - POPUP_MARGIN * 2, 120)}px`,
            }}
            role="dialog"
            aria-modal="false"
            aria-labelledby={headingId}
            aria-describedby={bodyId}
        >
            <div className="p2-phonetic-header">
                <strong id={headingId}>{word}</strong>
                <button
                    type="button"
                    className="p2-phonetic-close"
                    onClick={onClose}
                    aria-label="Close phonetic popup"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        focusable="false"
                    >
                        <path
                            d="M6 6 L18 18 M18 6 L6 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>

            {loading ? (
                <p id={bodyId} className="p2-phonetic-meta" aria-live="polite">
                    Loading pronunciation...
                </p>
            ) : null}
            {!loading && error ? (
                <p id={bodyId} className="p2-phonetic-error" aria-live="polite">
                    {error}
                </p>
            ) : null}
            {!loading && !error && ipa ? (
                <p id={bodyId} className="p2-phonetic-ipa" aria-live="polite">
                    {ipa}
                </p>
            ) : null}
        </div>
    )
}

export default PhoneticPopup
