type TranslationToggleProps = {
    enabled: boolean
    onToggle: () => void
}

function TranslationToggle({ enabled, onToggle }: TranslationToggleProps) {
    return (
        <button
            type="button"
            className="p2-translation-visibility-button"
            onClick={onToggle}
            aria-pressed={enabled}
            aria-label={
                enabled
                    ? 'Hide translation text'
                    : 'Show translation text'
            }
        >
            {enabled ? (
                <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    focusable="false"
                >
                    <path
                        d="M2 12 C4.6 7.5 8.2 5.2 12 5.2 C15.8 5.2 19.4 7.5 22 12 C19.4 16.5 15.8 18.8 12 18.8 C8.2 18.8 4.6 16.5 2 12 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                </svg>
            ) : (
                <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    focusable="false"
                >
                    <path
                        d="M2 12 C4.6 7.5 8.2 5.2 12 5.2 C15.8 5.2 19.4 7.5 22 12 C19.4 16.5 15.8 18.8 12 18.8 C8.2 18.8 4.6 16.5 2 12 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                    <path
                        d="M4 20 L20 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
            )}
        </button>
    )
}

export default TranslationToggle
