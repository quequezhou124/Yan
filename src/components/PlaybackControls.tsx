import type { PlaybackState } from '../services/ttsService'

type PlaybackControlsProps = {
  playbackState: PlaybackState
  autoPlay: boolean
  canGoPrevious: boolean
  canGoNext: boolean
  isBusy: boolean
  onPlay: () => void
  onPause: () => void
  onReplay: () => void
  onPrevious: () => void
  onNext: () => void
  onAutoPlayChange: (value: boolean) => void
}

export function PlaybackControls({
  playbackState,
  autoPlay,
  canGoPrevious,
  canGoNext,
  isBusy,
  onPlay,
  onPause,
  onReplay,
  onPrevious,
  onNext,
  onAutoPlayChange,
}: PlaybackControlsProps) {
  const isPlaying = playbackState === 'playing'

  return (
    <div className="controls-panel">
      <p className="sentence-label">Controls</p>

      <div className="control-grid">
        <button
          type="button"
          className="control-button control-button--secondary"
          onClick={onPrevious}
          disabled={!canGoPrevious || isBusy}
        >
          Previous
        </button>

        <button
          type="button"
          className="control-button control-button--primary"
          onClick={isPlaying ? onPause : onPlay}
          disabled={isBusy}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          type="button"
          className="control-button control-button--secondary"
          onClick={onNext}
          disabled={!canGoNext || isBusy}
        >
          Next
        </button>

        <button
          type="button"
          className="control-button control-button--ghost"
          onClick={onReplay}
          disabled={isBusy}
        >
          Replay current
        </button>
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={autoPlay}
          onChange={(event) => onAutoPlayChange(event.target.checked)}
        />
        <span>Auto-play next sentence</span>
      </label>
    </div>
  )
}
