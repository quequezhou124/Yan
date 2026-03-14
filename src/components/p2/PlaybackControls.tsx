type PlaybackControlsProps = {
    isPlaying: boolean
    onPlayPause: () => void
}

function PlaybackControls({ isPlaying, onPlayPause }: PlaybackControlsProps) {
    return (
        <div className="p2-playback">
            <button
                type="button"
                className="p2-play-icon-button"
                onClick={onPlayPause}
                aria-pressed={isPlaying}
                aria-label={isPlaying ? 'Stop sentence playback' : 'Play sentence'}
            >
                {isPlaying ? (
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        focusable="false"
                    >
                        <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                    </svg>
                ) : (
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        focusable="false"
                    >
                        <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
                    </svg>
                )}
            </button>
        </div>
    )
}

export default PlaybackControls
