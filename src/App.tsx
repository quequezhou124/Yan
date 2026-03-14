import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import yanLogo from './assets/yan.png'
import gooseLogo from './assets/goose.png'
import {
  defaultSelection,
  destinationOptions,
  sceneOptions,
  worldCountryOptions,
  worldLanguageOptions,
  type PracticeSelection,
  type PracticePreview,
  type SearchableOption,
} from './practiceData'

const PAGE_TWO_STORAGE_KEY = 'yan-page-two-payload'
const PAGE_TWO_CONTEXT_KEY = 'yan-page-two-context'
const USER_ID_STORAGE_KEY = 'yan-user-id'
const FIVE_DIGIT_USER_ID_PATTERN = /^\d{5}$/
const CONTENT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const CONTENT_SET_ID = '1'
const sceneApiPathMap = {
  Supermarket: 'shopping',
  Airport: 'airport',
  IRCC: 'ircc',
  Neighbourhood: 'neighbourhood',
} as const

type PracticePayload = PracticePreview['payload']

function createEmptyPreview(): PracticePreview {
  return {
    phonetics: [],
    payload: {
      p1: [],
      p2: {
        sentences: [],
        tsentences: [],
      },
    },
    isUnderConstruction: false,
    isReady: false,
  }
}

function isPracticePayload(value: unknown): value is PracticePayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as PracticePayload

  return (
    Array.isArray(payload.p1) &&
    payload.p1.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 3 &&
        entry.every((item) => typeof item === 'string'),
    ) &&
    Array.isArray(payload.p2?.sentences) &&
    payload.p2.sentences.every((sentence) => typeof sentence === 'string') &&
    Array.isArray(payload.p2?.tsentences) &&
    payload.p2.tsentences.every((sentence) => typeof sentence === 'string')
  )
}

function createPreviewFromPayload(payload: PracticePayload): PracticePreview {
  return {
    phonetics: payload.p1.map(([symbol, writing, example]) => ({
      symbol,
      writing,
      example,
    })),
    payload,
    isUnderConstruction: false,
    isReady: payload.p1.length > 0 && payload.p2.sentences.length > 0,
  }
}

function buildContentApiUrl(scene: string, language: string, country: string) {
  return `${CONTENT_API_BASE_URL}/content/${encodeURIComponent(
    CONTENT_SET_ID,
  )}/${encodeURIComponent(scene)}/${encodeURIComponent(
    language,
  )}/${encodeURIComponent(country)}`
}

function normalizeLookup(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

function findExactMatch(options: SearchableOption[], value: string) {
  const normalizedValue = normalizeLookup(value)

  if (!normalizedValue) {
    return null
  }

  return (
    options.find((option) => {
      if (normalizeLookup(option.value) === normalizedValue) {
        return true
      }

      return option.aliases.some(
        (alias) => normalizeLookup(alias) === normalizedValue,
      )
    }) ?? null
  )
}

function createRandomUserId() {
  return String(Math.floor(Math.random() * 100000)).padStart(5, '0')
}

function getCachedUserId() {
  if (typeof window === 'undefined') {
    return createRandomUserId()
  }

  const cachedUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY)

  if (cachedUserId && FIVE_DIGIT_USER_ID_PATTERN.test(cachedUserId)) {
    return cachedUserId
  }

  const nextUserId = createRandomUserId()
  window.localStorage.setItem(USER_ID_STORAGE_KEY, nextUserId)
  return nextUserId
}

type SearchFieldProps = {
  id: string
  label: string
  options: SearchableOption[]
  placeholder: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

function SearchField({
  id,
  label,
  options,
  placeholder,
  value,
  disabled = false,
  onChange,
}: SearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const normalizedValue = normalizeLookup(value)
  const suggestions =
    !disabled && isOpen && normalizedValue
      ? options.filter((option) => option.searchText.includes(normalizedValue)).slice(0, 8)
      : []

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    onChange(event.target.value)
    setIsOpen(true)
  }

  function handleBlur() {
    if (disabled) {
      setIsOpen(false)
      return
    }

    const exactMatch = findExactMatch(options, value)

    if (exactMatch && exactMatch.value !== value) {
      onChange(exactMatch.value)
    }

    window.setTimeout(() => {
      setIsOpen(false)
    }, 80)
  }

  function handleSelect(option: SearchableOption) {
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className="control-card">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="search-field">
        <input
          id={id}
          className="text-input"
          type="text"
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true)
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <div className="suggestion-list">
            {suggestions.map((option) => {
              const helper =
                option.aliases.find(
                  (alias) => normalizeLookup(alias) !== normalizeLookup(option.value),
                ) ?? ''

              return (
                <button
                  className="suggestion-item"
                  key={`${option.apiValue}-${option.value}-${helper}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(option)
                  }}
                >
                  <span>{option.value}</span>
                  {helper && <small>{helper}</small>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [userId] = useState(getCachedUserId)
  const [selection, setSelection] = useState(defaultSelection)
  const [preview, setPreview] = useState<PracticePreview>(createEmptyPreview)
  const [pageTwoMessage, setPageTwoMessage] = useState('')
  const [generateMessage, setGenerateMessage] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const requestVersionRef = useRef(0)
  const selectedCountry = findExactMatch(worldCountryOptions, selection.originCountry)
  const selectedLanguage = findExactMatch(
    worldLanguageOptions,
    selection.motherLanguage,
  )
  const selectedSceneApiPath = selection.scene
    ? sceneApiPathMap[selection.scene as keyof typeof sceneApiPathMap] ?? null
    : null
  const isSceneUnderConstruction =
    selection.scene === 'Customized' ||
    Boolean(selection.scene && !selectedSceneApiPath)
  const allFieldsFilled = Boolean(
    userId &&
      selection.destination &&
      selection.scene &&
      selectedCountry &&
      selectedLanguage,
  )
  const canGenerate = allFieldsFilled && !isSceneUnderConstruction && !isGenerating
  const canOpenPageTwo = hasGenerated && preview.isReady && !isGenerating

  function updateSelection<
    K extends Exclude<keyof PracticeSelection, 'variation'>,
  >(field: K, value: PracticeSelection[K]) {
    requestVersionRef.current += 1
    setSelection((current) => ({
      ...current,
      [field]: value,
      variation: 0,
    }))
    setPreview(createEmptyPreview())
    setPageTwoMessage('')
    setGenerateMessage('')
    setGenerateError('')
    setHasGenerated(false)
  }

  async function handleGenerate() {
    if (
      !selectedCountry ||
      !selectedLanguage ||
      !selectedSceneApiPath ||
      !canGenerate
    ) {
      return
    }

    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion

    setIsGenerating(true)
    setHasGenerated(false)
    setPreview(createEmptyPreview())
    setPageTwoMessage('')
    setGenerateMessage('')
    setGenerateError('')

    try {
      const response = await fetch(
        buildContentApiUrl(
          selectedSceneApiPath,
          selectedLanguage.apiValue,
          selectedCountry.apiValue,
        ),
        {
          headers: {
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}.`)
      }

      const payload: unknown = await response.json()

      if (!isPracticePayload(payload)) {
        throw new Error('Backend payload shape was invalid.')
      }

      if (requestVersion !== requestVersionRef.current) {
        return
      }

      const nextPreview = createPreviewFromPayload(payload)

      setPreview(nextPreview)
      setHasGenerated(nextPreview.isReady)
      setGenerateMessage(
        nextPreview.isReady ? 'Content loaded from backend.' : 'Backend returned no content.',
      )
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      const message =
        error instanceof Error ? error.message : 'Failed to load backend content.'

      setPreview(createEmptyPreview())
      setGenerateError(message)
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setIsGenerating(false)
      }
    }
  }

  function handleEnterPageTwo() {
    if (
      !userId ||
      !selection.destination ||
      !selection.scene ||
      !selectedCountry ||
      !selectedLanguage
    ) {
      setPageTwoMessage('Choose all items.')
      return
    }

    if (!preview.isReady) {
      setPageTwoMessage('Generate content first.')
      return
    }

    const timestamp = new Date()
    const payload = preview.payload
    const context = {
      userId,
      destination: selection.destination,
      scene: selection.scene,
      originalCountry: selectedCountry.value,
      originalCountryHint: selectedCountry.aliases[0] ?? selectedCountry.value,
      motherLanguage: selectedLanguage.value,
      motherLanguageHint: selectedLanguage.aliases[0] ?? selectedLanguage.value,
      createdAt: timestamp.toISOString(),
    }

    window.sessionStorage.setItem(PAGE_TWO_STORAGE_KEY, JSON.stringify(payload))
    window.sessionStorage.setItem(PAGE_TWO_CONTEXT_KEY, JSON.stringify(context))
    setPageTwoMessage(
      `Saved at ${timestamp.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}.`,
    )
  }

  return (
    <main className="page-shell" aria-busy={isGenerating}>
      {isGenerating && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <div className="loading-spinner" aria-hidden="true" />
            <p className="card-label">Loading</p>
            <h2>Generating your content</h2>
            <p className="panel-copy">Please wait while the backend prepares phonetics and sentences.</p>
          </div>
        </div>
      )}

      <header className="page-header page-header-brand">
        <div className="brand-lockup">
          <img className="brand-image" src={yanLogo} alt="Yan" />
          <span className="brand-wordmark">YAN</span>
        </div>
        <img className="brand-goose" src={gooseLogo} alt="" />
      </header>

      <section className="page-frame">
        <section className="workspace-card">

          {/* ── Your Setup (5 bars) ── */}
          <div className="section-header">
            <span className="section-chip section-chip-purple">Your Setup</span>
          </div>

          <div className="control-grid control-grid-five">
            <div className="control-card">
              <label className="field-label" htmlFor="user-id">
                User ID
              </label>
              <input
                id="user-id"
                className="text-input"
                type="text"
                value={userId}
                disabled={isGenerating}
                readOnly
                autoComplete="off"
              />
            </div>

            <label className="control-card">
              <span className="field-label">Destination</span>
              <select
                value={selection.destination}
                disabled={isGenerating}
                onChange={(event) =>
                  updateSelection(
                    'destination',
                    event.target.value as PracticeSelection['destination'],
                  )
                }
              >
                <option value="">Select destination</option>
                {destinationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="control-card">
              <span className="field-label">Choose scene</span>
              <select
                value={selection.scene}
                disabled={isGenerating}
                onChange={(event) =>
                  updateSelection(
                    'scene',
                    event.target.value as PracticeSelection['scene'],
                  )
                }
              >
                <option value="">Select scene</option>
                {sceneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'Customized'
                      ? 'Customized (under construction)'
                      : option}
                  </option>
                ))}
              </select>
            </label>

            <SearchField
              id="origin-country"
              label="Original country"
              options={worldCountryOptions}
              placeholder="Type to narrow the country list"
              value={selection.originCountry}
              disabled={isGenerating}
              onChange={(value) => updateSelection('originCountry', value)}
            />

            <SearchField
              id="mother-language"
              label="Mother language"
              options={worldLanguageOptions}
              placeholder="Type to narrow the language list"
              value={selection.motherLanguage}
              disabled={isGenerating}
              onChange={(value) => updateSelection('motherLanguage', value)}
            />
          </div>

          <hr className="section-divider" />

          {/* ── Generate set ── */}
          <article className="action-card">
            <p className="card-label">Generate set</p>
            <h3>Generate the phonetic and content</h3>
            <button
              className="secondary-button"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {isGenerating ? 'Generating...' : 'Generate the phonetic and content'}
            </button>
            {generateMessage && <p className="status-note">{generateMessage}</p>}
            {generateError && <p className="status-note status-note-error">{generateError}</p>}
          </article>

          <hr className="section-divider" />

          {/* ── Phonetic preview ── */}
          {isSceneUnderConstruction ? (
            <section className="construction-panel">
              <p className="card-label">Scene</p>
              <h2>Customized is not ready.</h2>
              <p className="panel-copy">Use another scene for now.</p>
            </section>
          ) : isGenerating ? (
            <section className="construction-panel">
              <p className="card-label">Phonetic preview</p>
              <h2>Loading content from backend.</h2>
              <p className="panel-copy">Waiting for `127.0.0.1:8000` to return phonetics and sentences.</p>
            </section>
          ) : generateError ? (
            <section className="construction-panel">
              <p className="card-label">Phonetic preview</p>
              <h2>Backend request failed.</h2>
              <p className="panel-copy">{generateError}</p>
            </section>
          ) : hasGenerated && preview.isReady ? (
            <section className="phonetic-panel">
              <div className="panel-head">
                <div>
                  <p className="card-label">Phonetic preview</p>
                  <h2>{selection.scene}</h2>
                </div>
                <p className="panel-badge">{selection.scene}</p>
              </div>

              <p className="panel-copy">What you will learn</p>

              <div className="phonetic-list">
                {preview.phonetics.map((entry) => (
                  <article
                    className="phonetic-row"
                    key={`${entry.symbol}-${entry.example}`}
                  >
                    <div>
                      <span className="row-label">Phonetic</span>
                      <strong>{entry.symbol}</strong>
                    </div>
                    <div>
                      <span className="row-label">Writing</span>
                      <strong>{entry.writing}</strong>
                    </div>
                    <div>
                      <span className="row-label">Example</span>
                      <strong>{entry.example}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="construction-panel">
              <p className="card-label">Phonetic preview</p>
              <h2>{allFieldsFilled ? 'Ready to generate!' : 'Complete your setup.'}</h2>
              <p className="panel-copy">
                {allFieldsFilled
                  ? 'Click Generate above to preview your phonetics.'
                  : 'Fill in all 5 fields above, then click Generate.'}
              </p>
            </section>
          )}

          <hr className="section-divider" />

          {/* ── Page 2 ── */}
          <article className="action-card action-card-primary">
            <p className="card-label">Page 2</p>
            <h3>Enter to page 2</h3>
            <button
              className="primary-button"
              onClick={handleEnterPageTwo}
              disabled={!canOpenPageTwo}
            >
              Enter to page 2
            </button>
            {pageTwoMessage && <p className="status-note">{pageTwoMessage}</p>}
          </article>

        </section>
      </section>
    </main>
  )
}

export default App
