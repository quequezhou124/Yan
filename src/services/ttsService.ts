import { estimateSpeechTiming } from '../utils/speechSync'

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'finished'
export type TtsEngine = 'provider' | 'browser' | 'error'

type CreateTtsPlayerOptions = {
  onStateChange: (state: PlaybackState) => void
  onError: (message: string) => void
  onPlaybackStart: () => void
  onPlaybackEnd: () => void
  onEngineChange: (engine: TtsEngine) => void
}

export type TtsPlayer = {
  play: (text: string) => Promise<void>
  pause: () => void
  stop: () => void
  dispose: () => void
}

type TtsMode = 'browser' | 'provider'

const DEFAULT_VOICE = 'alloy'
const DEFAULT_MODEL = 'gpt-4o-mini-tts'
const DEFAULT_BASE_URL = 'https://newapi.houdao.com/v1'

export function createTtsPlayer(options: CreateTtsPlayerOptions): TtsPlayer {
  const requestedMode = import.meta.env.VITE_TTS_MODE as TtsMode | undefined
  const mode: TtsMode = requestedMode === 'provider' ? 'provider' : 'browser'
  const config = readTtsConfig()

  console.log('[env check]', {
    MODE: import.meta.env.MODE,
    VITE_TTS_MODE: import.meta.env.VITE_TTS_MODE,
    HAS_VITE_TTS_API_KEY: Boolean(import.meta.env.VITE_TTS_API_KEY),
    VITE_TTS_BASE_URL: import.meta.env.VITE_TTS_BASE_URL,
    VITE_TTS_MODEL: import.meta.env.VITE_TTS_MODEL,
    VITE_TTS_VOICE: import.meta.env.VITE_TTS_VOICE,
  })
  logTtsConfig(mode, config)

  if (mode === 'provider') {
    if (!config.apiKey) {
      const message =
        'Provider mode requested, but VITE_TTS_API_KEY was not loaded by Vite.'

      console.error(`[tts] ${message}`)
      options.onEngineChange('error')
      options.onError(message)
    } else {
      options.onEngineChange('provider')
    }

    return createProviderPlayer({
      ...options,
      config,
    })
  }

  options.onEngineChange('browser')
  return createBrowserSpeechPlayer(options)
}

function createBrowserSpeechPlayer({
  onStateChange,
  onError,
  onPlaybackStart,
  onPlaybackEnd,
  onEngineChange,
}: CreateTtsPlayerOptions): TtsPlayer {
  let utterance: SpeechSynthesisUtterance | null = null

  function stopCurrentPlayback(nextState: PlaybackState = 'idle') {
    window.speechSynthesis.cancel()
    utterance = null
    onStateChange(nextState)
  }

  return {
    async play(text: string) {
      if (!('speechSynthesis' in window)) {
        onError('Browser speech synthesis is not available in this browser.')
        onEngineChange('error')
        onStateChange('idle')
        return
      }

      stopCurrentPlayback('loading')

      const nextUtterance = new SpeechSynthesisUtterance(text)
      const timing = estimateSpeechTiming(text)
      nextUtterance.rate = timing.rate
      nextUtterance.pitch = 1
      nextUtterance.lang = import.meta.env.VITE_TTS_LANG ?? 'en-US'

      nextUtterance.onstart = () => {
        utterance = nextUtterance
        onEngineChange('browser')
        console.info('[tts] playback using browser speech synthesis')
        onPlaybackStart()
        onStateChange('playing')
      }

      nextUtterance.onend = () => {
        utterance = null
        onStateChange('finished')
        onPlaybackEnd()
      }

      nextUtterance.onerror = () => {
        utterance = null
        onError('Speech playback failed. Try replaying the sentence.')
        onEngineChange('error')
        onStateChange('idle')
      }

      window.speechSynthesis.speak(nextUtterance)
    },

    pause() {
      if (!utterance) {
        return
      }

      window.speechSynthesis.cancel()
      utterance = null
      onStateChange('paused')
    },

    stop() {
      stopCurrentPlayback('idle')
    },

    dispose() {
      stopCurrentPlayback('idle')
    },
  }
}

function createProviderPlayer({
  onStateChange,
  onError,
  onPlaybackStart,
  onPlaybackEnd,
  onEngineChange,
  config,
}: CreateTtsPlayerOptions & {
  config: TtsConfig
}): TtsPlayer {
  let audio: HTMLAudioElement | null = null
  let activeObjectUrl: string | null = null
  let currentText: string | null = null

  function cleanupObjectUrl() {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl)
      activeObjectUrl = null
    }
  }

  function stopAudio(nextState: PlaybackState = 'idle') {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio.load()
      audio = null
    }

    cleanupObjectUrl()
    onStateChange(nextState)
  }

  return {
    async play(text: string) {
      if (audio && currentText === text && onResume(audio, onPlaybackStart, onStateChange, onEngineChange)) {
        return
      }

      onStateChange('loading')
      stopAudio('loading')

      try {
        const audioBlob = await requestProviderSpeech(text, config)
        const objectUrl = URL.createObjectURL(audioBlob)
        const nextAudio = new Audio(objectUrl)

        currentText = text
        activeObjectUrl = objectUrl
        audio = nextAudio

        nextAudio.onended = () => {
          console.info('[tts] playback using provider audio')
          stopAudio('finished')
          onPlaybackEnd()
        }

        nextAudio.onerror = () => {
          const message = 'Provider audio playback failed in the browser.'
          console.error('[tts] provider audio element error')
          onEngineChange('error')
          onError(message)
          stopAudio('idle')
        }

        onEngineChange('provider')
        console.info('[tts] playback using provider audio')
        onPlaybackStart()
        await nextAudio.play()
        onStateChange('playing')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Provider TTS request failed.'

        console.error('[tts] provider playback failed', error)
        onEngineChange('error')
        onError(message)
        onStateChange('idle')
      }
    },

    pause() {
      if (!audio) {
        return
      }

      audio.pause()
      onStateChange('paused')
    },

    stop() {
      stopAudio('idle')
      currentText = null
    },

    dispose() {
      stopAudio('idle')
      currentText = null
    },
  }
}

type TtsConfig = {
  apiKey: string
  baseUrl: string
  model: string
  voice: string
}

function readTtsConfig(): TtsConfig {
  return {
    apiKey: import.meta.env.VITE_TTS_API_KEY ?? '',
    baseUrl: import.meta.env.VITE_TTS_BASE_URL ?? DEFAULT_BASE_URL,
    model: import.meta.env.VITE_TTS_MODEL ?? DEFAULT_MODEL,
    voice: import.meta.env.VITE_TTS_VOICE ?? DEFAULT_VOICE,
  }
}

function logTtsConfig(mode: TtsMode, config: TtsConfig) {
  console.info('[tts] current mode:', mode)
  console.info('[tts] api key exists:', Boolean(config.apiKey))
  console.info('[tts] base URL:', config.baseUrl)
  console.info('[tts] model:', config.model)
  console.info('[tts] voice:', config.voice)
}

function onResume(
  audio: HTMLAudioElement,
  onPlaybackStart: () => void,
  onStateChange: (state: PlaybackState) => void,
  onEngineChange: (engine: TtsEngine) => void,
) {
  if (!audio.paused || audio.ended) {
    return false
  }

  onEngineChange('provider')
  console.info('[tts] playback resumed using provider audio')
  onPlaybackStart()
  void audio.play()
  onStateChange('playing')
  return true
}

async function requestProviderSpeech(input: string, config: TtsConfig) {
  if (!config.apiKey) {
    throw new Error('Missing VITE_TTS_API_KEY for provider TTS mode.')
  }

  console.info('[tts] provider request config:', {
    model: config.model,
    voice: config.voice,
    baseUrl: config.baseUrl,
  })

  const response = await fetch(`${config.baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      voice: config.voice,
      input,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('[tts] provider response status:', response.status)
    console.error('[tts] provider response body:', body)
    throw new Error(body)
  }

  return response.blob()
}
