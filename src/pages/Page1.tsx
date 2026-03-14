import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import gooseLogo from '../assets/goose.png'
import yanLogo from '../assets/yan.png'
import {
    destinationOptions,
    worldCountryOptions,
    worldLanguageOptions,
    type SearchableOption,
} from '../contentCatalog'
import { SceneId } from '../config/sceneBackgrounds'
import type { SceneId as SceneIdValue } from '../config/sceneBackgrounds'
import type { P2Payload } from '../types/dialogue'
import '../styles/p1.css'

const CONTENT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const CONTENT_SET_ID = '1'
const PAGE_TWO_STORAGE_KEY = 'yan-page-two-payload'
const USER_ID_STORAGE_KEY = 'yan-user-id'
const FIVE_DIGIT_USER_ID_PATTERN = /^\d{5}$/

const SCENE_OPTIONS: Array<{ id: SceneIdValue; label: string }> = [
    { id: SceneId.Supermarket, label: 'Supermarket' },
    { id: SceneId.Airport, label: 'Airport' },
    { id: SceneId.IRCC, label: 'IRCC' },
    { id: SceneId.NeighborhoodMeetup, label: 'Neighbourhood' },
    { id: SceneId.Custom, label: 'Custom' },
]

const getSceneApiPath = (sceneId: SceneIdValue): string | null => {
    switch (sceneId) {
        case SceneId.Supermarket:
            return 'shopping'
        case SceneId.Airport:
            return 'airport'
        case SceneId.IRCC:
            return 'ircc'
        case SceneId.NeighborhoodMeetup:
            return 'neighbourhood'
        case SceneId.Custom:
        default:
            return null
    }
}

type BackendPhoneticTuple = [string, string, string]

type BackendContentPayload = {
    p1: BackendPhoneticTuple[]
    p2: {
        sentences: string[]
        tsentences: string[]
    }
}

type ScenePreview = {
    phonetics: Array<{
        symbol: string
        writing: string
        example: string
    }>
    p2: P2Payload
    isReady: boolean
}

const createEmptyPreview = (): ScenePreview => {
    return {
        phonetics: [],
        p2: {
            sentences: [],
            translations: [],
        },
        isReady: false,
    }
}

const isStringArray = (value: unknown): value is string[] => {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

const isPhoneticTupleArray = (value: unknown): value is BackendPhoneticTuple[] => {
    return (
        Array.isArray(value) &&
        value.every(
            (entry) =>
                Array.isArray(entry) &&
                entry.length === 3 &&
                entry.every((cell) => typeof cell === 'string')
        )
    )
}

const isBackendContentPayload = (value: unknown): value is BackendContentPayload => {
    if (!value || typeof value !== 'object') {
        return false
    }

    const payload = value as BackendContentPayload

    return (
        isPhoneticTupleArray(payload.p1) &&
        isStringArray(payload.p2?.sentences) &&
        isStringArray(payload.p2?.tsentences)
    )
}

const createPreviewFromPayload = (payload: BackendContentPayload): ScenePreview => {
    const p2: P2Payload = {
        sentences: payload.p2.sentences,
        translations: payload.p2.tsentences,
    }

    return {
        phonetics: payload.p1.map(([symbol, writing, example]) => ({
            symbol,
            writing,
            example,
        })),
        p2,
        isReady: payload.p1.length > 0 && payload.p2.sentences.length > 0,
    }
}

const buildContentApiUrl = (
    sceneApiPath: string,
    languageApiValue: string,
    countryApiValue: string
): string => {
    return `${CONTENT_API_BASE_URL}/content/${encodeURIComponent(
        CONTENT_SET_ID
    )}/${encodeURIComponent(sceneApiPath)}/${encodeURIComponent(
        languageApiValue
    )}/${encodeURIComponent(countryApiValue)}`
}

function normalizeLookup(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/\p{Mark}/gu, '')
        .replace(/[’']/g, "'")
        .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
        .trim()
        .toLowerCase()
}

const findExactMatch = (
    options: SearchableOption[],
    value: string
): SearchableOption | null => {
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
                (alias) => normalizeLookup(alias) === normalizedValue
            )
        }) ?? null
    )
}

const createRandomUserId = (): string => {
    return String(Math.floor(Math.random() * 100000)).padStart(5, '0')
}

const getCachedUserId = (): string => {
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
            ? options
                  .filter((option) => option.searchText.includes(normalizedValue))
                  .slice(0, 8)
            : []

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (disabled) {
            return
        }

        onChange(event.target.value)
        setIsOpen(true)
    }

    const handleBlur = () => {
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

    const handleSelect = (option: SearchableOption) => {
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
                {suggestions.length > 0 ? (
                    <div className="suggestion-list">
                        {suggestions.map((option) => {
                            const helper =
                                option.aliases.find(
                                    (alias) =>
                                        normalizeLookup(alias) !==
                                        normalizeLookup(option.value)
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
                                    {helper ? <small>{helper}</small> : null}
                                </button>
                            )
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function Page1() {
    const navigate = useNavigate()
    const requestVersionRef = useRef(0)
    const [userId] = useState(getCachedUserId)
    const [destination, setDestination] = useState<
        (typeof destinationOptions)[number] | ''
    >('')
    const [selectedScene, setSelectedScene] = useState<SceneIdValue>(
        SceneId.Supermarket
    )
    const [originCountry, setOriginCountry] = useState('')
    const [motherLanguage, setMotherLanguage] = useState('')
    const [customBackgroundUrl, setCustomBackgroundUrl] = useState('')
    const [preview, setPreview] = useState<ScenePreview>(createEmptyPreview)
    const [isGenerating, setIsGenerating] = useState(false)
    const [hasGenerated, setHasGenerated] = useState(false)
    const [generateMessage, setGenerateMessage] = useState('')
    const [generateError, setGenerateError] = useState('')

    const normalizedCustomBackgroundUrl = customBackgroundUrl.trim()
    const isCustomScene = selectedScene === SceneId.Custom
    const hasCustomBackgroundUrl =
        !isCustomScene || normalizedCustomBackgroundUrl.length > 0
    const selectedSceneApiPath = getSceneApiPath(selectedScene)
    const isSceneUnderConstruction =
        selectedScene === SceneId.Custom || !selectedSceneApiPath

    const selectedSceneLabel = useMemo(
        () =>
            SCENE_OPTIONS.find((sceneOption) => sceneOption.id === selectedScene)
                ?.label ?? 'Supermarket',
        [selectedScene]
    )
    const selectedCountry = findExactMatch(worldCountryOptions, originCountry)
    const selectedLanguage = findExactMatch(worldLanguageOptions, motherLanguage)
    const allFieldsFilled = Boolean(
        userId && destination && selectedCountry && selectedLanguage
    )
    const canGenerate =
        allFieldsFilled &&
        hasCustomBackgroundUrl &&
        !isSceneUnderConstruction &&
        !isGenerating
    const canEnterScene =
        hasGenerated && preview.isReady && hasCustomBackgroundUrl && !isGenerating

    useEffect(() => {
        requestVersionRef.current += 1
        setPreview(createEmptyPreview())
        setHasGenerated(false)
        setGenerateMessage('')
        setGenerateError('')
    }, [
        destination,
        selectedScene,
        originCountry,
        motherLanguage,
        normalizedCustomBackgroundUrl,
    ])

    const handleGenerate = async () => {
        if (!selectedCountry || !selectedLanguage || !selectedSceneApiPath) {
            return
        }

        if (!allFieldsFilled) {
            setGenerateError('Fill in all setup fields before generating.')
            setGenerateMessage('')
            setHasGenerated(false)
            return
        }

        if (!hasCustomBackgroundUrl) {
            setGenerateError('Add a custom background URL for the Custom scene.')
            setGenerateMessage('')
            setHasGenerated(false)
            return
        }

        const requestVersion = requestVersionRef.current + 1
        requestVersionRef.current = requestVersion

        setIsGenerating(true)
        setHasGenerated(false)
        setPreview(createEmptyPreview())
        setGenerateMessage('')
        setGenerateError('')

        try {
            const response = await fetch(
                buildContentApiUrl(
                    selectedSceneApiPath,
                    selectedLanguage.apiValue,
                    selectedCountry.apiValue
                ),
                {
                    headers: {
                        Accept: 'application/json',
                    },
                }
            )

            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}.`)
            }

            const payload: unknown = await response.json()
            if (!isBackendContentPayload(payload)) {
                throw new Error('Backend payload shape was invalid.')
            }

            if (requestVersion !== requestVersionRef.current) {
                return
            }

            const nextPreview = createPreviewFromPayload(payload)
            setPreview(nextPreview)
            setHasGenerated(nextPreview.isReady)
            setGenerateMessage(
                nextPreview.isReady
                    ? 'Content loaded from backend.'
                    : 'Backend returned no content.'
            )
        } catch (error) {
            if (requestVersion !== requestVersionRef.current) {
                return
            }

            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to load backend content.'

            setPreview(createEmptyPreview())
            setGenerateError(message)
        } finally {
            if (requestVersion === requestVersionRef.current) {
                setIsGenerating(false)
            }
        }
    }

    const handleEnterScene = () => {
        if (!canEnterScene) {
            if (!hasGenerated) {
                setGenerateError('Generate set first.')
            }
            return
        }

        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(
                PAGE_TWO_STORAGE_KEY,
                JSON.stringify(preview.p2)
            )
        }

        navigate(`/p2/${selectedScene}`, {
            state: {
                p2: preview.p2,
                customBackgroundUrl:
                    selectedScene === SceneId.Custom
                        ? normalizedCustomBackgroundUrl || undefined
                        : undefined,
            },
        })
    }

    return (
        <main className="page-shell">
            <header className="page-header page-header-brand">
                <div className="brand-lockup">
                    <img className="brand-image" src={yanLogo} alt="Yan" />
                    <span className="brand-wordmark">YAN</span>
                </div>
                <img className="brand-goose" src={gooseLogo} alt="" />
            </header>

            <section className="page-frame">
                <section className="workspace-card">
                    <div className="section-header">
                        <span className="section-chip section-chip-purple">
                            Practice Setup
                        </span>
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
                                readOnly
                            />
                        </div>

                        <label className="control-card" htmlFor="destination-select">
                            <span className="field-label">Destination</span>
                            <select
                                id="destination-select"
                                value={destination}
                                disabled={isGenerating}
                                onChange={(event) =>
                                    setDestination(
                                        event.target
                                            .value as (typeof destinationOptions)[number] | ''
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

                        <label className="control-card" htmlFor="scene-select">
                            <span className="field-label">Choose scene</span>
                            <select
                                id="scene-select"
                                value={selectedScene}
                                disabled={isGenerating}
                                onChange={(event) =>
                                    setSelectedScene(
                                        Number.parseInt(event.target.value, 10) as SceneIdValue
                                    )
                                }
                            >
                                {SCENE_OPTIONS.map((sceneOption) => (
                                    <option key={sceneOption.id} value={sceneOption.id}>
                                        {sceneOption.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <SearchField
                            id="origin-country"
                            label="Original country"
                            options={worldCountryOptions}
                            placeholder="Type to narrow the country list"
                            value={originCountry}
                            disabled={isGenerating}
                            onChange={setOriginCountry}
                        />

                        <SearchField
                            id="mother-language"
                            label="Mother language"
                            options={worldLanguageOptions}
                            placeholder="Type to narrow the language list"
                            value={motherLanguage}
                            disabled={isGenerating}
                            onChange={setMotherLanguage}
                        />
                    </div>

                    {isCustomScene ? (
                        <div className="control-card custom-url-control">
                            <label className="field-label" htmlFor="custom-bg">
                                Custom background URL
                            </label>
                            <input
                                id="custom-bg"
                                className="text-input"
                                type="url"
                                placeholder="https://example.com/custom-scene.jpg"
                                value={customBackgroundUrl}
                                disabled={isGenerating}
                                onChange={(event) =>
                                    setCustomBackgroundUrl(event.target.value)
                                }
                            />
                            {!hasCustomBackgroundUrl ? (
                                <p className="status-note status-note-error">
                                    Add a custom image URL to continue.
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <hr className="section-divider" />

                    <article className="action-card">
                        <p className="card-label">Generate set</p>
                        <h3>Generate the phonetic and content</h3>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                        >
                            {isGenerating
                                ? 'Generating...'
                                : 'Generate the phonetic and content'}
                        </button>
                        {generateMessage ? <p className="status-note">{generateMessage}</p> : null}
                        {generateError ? (
                            <p className="status-note status-note-error">{generateError}</p>
                        ) : null}
                    </article>

                    <hr className="section-divider" />

                    {isSceneUnderConstruction ? (
                        <section className="construction-panel">
                            <p className="card-label">Scene</p>
                            <h2>Customized is not ready.</h2>
                            <p className="panel-copy">Use another scene for now.</p>
                        </section>
                    ) : isGenerating ? (
                        <section className="construction-panel">
                            <p className="card-label">Scene summary</p>
                            <h2>Loading content from backend.</h2>
                            <p className="panel-copy">
                                Waiting for the backend to return phonetics and sentences.
                            </p>
                        </section>
                    ) : generateError ? (
                        <section className="construction-panel">
                            <p className="card-label">Scene summary</p>
                            <h2>Backend request failed.</h2>
                            <p className="panel-copy">{generateError}</p>
                        </section>
                    ) : hasGenerated && preview.isReady ? (
                        <section className="phonetic-panel">
                            <div className="panel-head">
                                <div>
                                    <p className="card-label">Scene summary</p>
                                    <h2>{selectedSceneLabel}</h2>
                                </div>
                                <p className="panel-badge">{selectedSceneLabel}</p>
                            </div>

                            <p className="panel-copy">What you will learn</p>

                            <div className="phonetic-list">
                                {preview.phonetics.map((entry, index) => (
                                    <article
                                        className="phonetic-row"
                                        key={`${entry.symbol}-${entry.example}-${index}`}
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
                            <p className="card-label">Scene summary</p>
                            <h2>{allFieldsFilled ? 'Ready to generate!' : 'Complete your setup.'}</h2>
                            <p className="panel-copy">
                                {allFieldsFilled
                                    ? 'Click Generate above to preview your phonetics.'
                                    : 'Fill in all 5 fields above, then click Generate.'}
                            </p>
                        </section>
                    )}

                    <hr className="section-divider" />

                    <article className="action-card action-card-primary">
                        <p className="card-label">Enter scene</p>
                        <h3>Enter scene</h3>
                        <button
                            type="button"
                            className="primary-button"
                            onClick={handleEnterScene}
                            disabled={!canEnterScene}
                        >
                            Enter scene
                        </button>
                    </article>
                </section>
            </section>
        </main>
    )
}

export default Page1
