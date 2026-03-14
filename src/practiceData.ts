export const destinationOptions = ['Canada', 'United States'] as const

export const sceneOptions = [
  'Supermarket',
  'Airport',
  'IRCC',
  'Neighbourhood',
  'Customized',
] as const

export type Destination = (typeof destinationOptions)[number]
export type Scene = (typeof sceneOptions)[number]

export type SearchableOption = {
  value: string
  aliases: string[]
  apiValue: string
  searchText: string
}

export type PhoneticRow = {
  symbol: string
  writing: string
  example: string
}

export type PracticeSelection = {
  destination: Destination | ''
  scene: Scene | ''
  originCountry: string
  motherLanguage: string
  variation: number
}

type PracticePayload = {
  p1: [string, string, string][]
  p2: {
    sentences: string[]
    tsentences: string[]
  }
}

export type PracticePreview = {
  phonetics: PhoneticRow[]
  payload: PracticePayload
  isUnderConstruction: boolean
  isReady: boolean
}

const englishCountryNames = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  "Cote d'Ivoire",
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
] as const

const englishRegionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const englishLanguageNames = new Intl.DisplayNames(['en'], { type: 'language' })

function normalizeLookup(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function buildSearchableOption(
  value: string,
  aliases: string[],
  apiValue = value,
): SearchableOption {
  const tokens = uniqueStrings([value, ...aliases])

  return {
    value,
    aliases: uniqueStrings(aliases),
    apiValue,
    searchText: tokens.map(normalizeLookup).join(' '),
  }
}

function createRegionCodeMap() {
  const codeMap = new Map<string, string>()

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second)
      const englishName = englishRegionNames.of(code)

      if (englishName && englishName !== code) {
        codeMap.set(normalizeLookup(englishName), code)
      }
    }
  }

  const overrides: Record<string, string> = {
    'czech republic': 'CZ',
    'cote d ivoire': 'CI',
    "cote d'ivoire": 'CI',
    'democratic republic of the congo': 'CD',
    'micronesia': 'FM',
    'north korea': 'KP',
    'north macedonia': 'MK',
    'palestine': 'PS',
    'south korea': 'KR',
    'timor leste': 'TL',
    'timor-leste': 'TL',
    'united states': 'US',
    'vatican city': 'VA',
  }

  for (const [name, code] of Object.entries(overrides)) {
    codeMap.set(normalizeLookup(name), code)
  }

  return codeMap
}

function getNativeRegionLabel(code: string, fallback: string) {
  const overrides: Record<string, string> = {
    PS: 'فلسطين',
  }

  if (overrides[code]) {
    return overrides[code]
  }

  try {
    const locale = new Intl.Locale(`und-${code}`).maximize().toString()
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? fallback
  } catch {
    return fallback
  }
}

const regionCodeMap = createRegionCodeMap()

export const worldCountryOptions = englishCountryNames.map((englishName) => {
  const code = regionCodeMap.get(normalizeLookup(englishName))

  if (!code) {
    return buildSearchableOption(englishName, [englishName], englishName)
  }

  return buildSearchableOption(getNativeRegionLabel(code, englishName), [
    englishName,
    code,
  ], englishName)
})

function getNativeLanguageLabel(code: string, fallback: string) {
  const overrides: Record<string, string> = {
    cmn: '普通话',
    yue: '粵語',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'zh-Hans': '简体中文',
    'zh-Hant': '繁體中文',
  }

  if (overrides[code]) {
    return overrides[code]
  }

  try {
    const locale = new Intl.Locale(code).maximize().toString()
    const nativeName = new Intl.DisplayNames([locale], { type: 'language' }).of(code)

    return nativeName && nativeName !== code ? nativeName : fallback
  } catch {
    return fallback
  }
}

function createLanguageOptions() {
  const options = new Map<string, SearchableOption>()
  const excludedCodes = new Set(['art', 'mis', 'mul', 'und', 'zxx'])
  const variantEntries = [
    ['zh-CN', 'Chinese', ['Simplified Chinese', 'Mandarin', 'zh', 'zh-Hans']],
    ['zh-TW', 'Traditional Chinese', ['Chinese Traditional', 'zh-Hant']],
    ['cmn', 'Mandarin Chinese', ['Mandarin']],
    ['yue', 'Cantonese', []],
  ] as const

  function addLanguageOption(
    code: string,
    fallbackEnglishName: string,
    extraAliases: readonly string[] = [],
  ) {
    if (excludedCodes.has(code) || options.has(code)) {
      return
    }

    const englishName = englishLanguageNames.of(code) ?? fallbackEnglishName

    if (!englishName || englishName === code) {
      return
    }

    if (
      /unknown language|multiple languages|no linguistic content/i.test(
        englishName,
      )
    ) {
      return
    }

    const aliasOverrides: Record<string, string[]> = {
      az: ['Azeri'],
      fa: ['Farsi'],
      fil: ['Filipino'],
      he: ['Hebrew'],
      iu: ['Inuktitut'],
      kl: ['Greenlandic'],
      ku: ['Kurdish'],
      my: ['Burmese'],
      rm: ['Romansh'],
      ug: ['Uighur', 'Uyghur'],
    }

    options.set(
      code,
      buildSearchableOption(getNativeLanguageLabel(code, fallbackEnglishName), [
        englishName,
        fallbackEnglishName,
        code,
        ...(aliasOverrides[code] ?? []),
        ...extraAliases,
      ], code),
    )
  }

  for (const [code, englishName, aliases] of variantEntries) {
    addLanguageOption(code, englishName, aliases)
  }

  for (let first = 97; first <= 122; first += 1) {
    for (let second = 97; second <= 122; second += 1) {
      const code2 = String.fromCharCode(first, second)
      addLanguageOption(code2, code2)

      for (let third = 97; third <= 122; third += 1) {
        const code3 = `${code2}${String.fromCharCode(third)}`
        addLanguageOption(code3, code3)
      }
    }
  }

  const dedupedOptions: SearchableOption[] = []
  const seenFingerprints = new Set<string>()

  for (const option of options.values()) {
    const primaryAlias = option.aliases[0] ?? option.value
    const fingerprint = `${normalizeLookup(option.value)}::${normalizeLookup(primaryAlias)}`

    if (seenFingerprints.has(fingerprint)) {
      continue
    }

    seenFingerprints.add(fingerprint)
    dedupedOptions.push(option)
  }

  return dedupedOptions.sort((left, right) => {
    const leftKey = left.aliases[0] ?? left.value
    const rightKey = right.aliases[0] ?? right.value

    return leftKey.localeCompare(rightKey)
  })
}

export const worldLanguageOptions = createLanguageOptions()

const phoneticPool: PhoneticRow[] = [
  { symbol: 'ae', writing: 'a', example: 'apple' },
  { symbol: 'th', writing: 'th', example: 'think' },
  { symbol: 'r', writing: 'r', example: 'rice' },
  { symbol: 'sh', writing: 'sh', example: 'shoe' },
  { symbol: 'ee', writing: 'ee', example: 'see' },
  { symbol: 'oi', writing: 'oi', example: 'coin' },
  { symbol: 'ch', writing: 'ch', example: 'chair' },
  { symbol: 'ow', writing: 'ow', example: 'how' },
]

const sceneSentenceBundles: Record<Exclude<Scene, 'Customized'>, string[][]> = {
  Supermarket: [
    [
      'Excuse me, where can I find the apples?',
      'Could you tell me the price of this bread?',
      'I would like one bag of rice, please.',
      'Do you have a smaller bottle of milk?',
    ],
    [
      'Are these vegetables fresh today?',
      'Can I buy half a kilo of grapes?',
      'Which one is less sweet?',
      'Please put these tomatoes in a separate bag.',
    ],
  ],
  Airport: [
    [
      'Hello, I would like to check in for my flight.',
      'Here is my passport and boarding pass.',
      'Can I bring this bag as carry-on luggage?',
      'What time does boarding start?',
    ],
    [
      'Excuse me, where is gate twenty-three?',
      'Is this the line for security screening?',
      'My flight was changed. Which gate should I go to now?',
      'How far is the international terminal from here?',
    ],
  ],
  IRCC: [
    [
      'Hello, I have an appointment this morning.',
      'I would like to confirm which documents I need.',
      'Can I submit this form today?',
      'How long does the next step usually take?',
    ],
    [
      'I received an email and I need help understanding it.',
      'Is anything missing from my application?',
      'Could you explain this request one more time?',
      'Where can I upload the additional documents?',
    ],
  ],
  Neighbourhood: [
    [
      'Hi, is there a pharmacy near this street?',
      'Which bus goes to the public library?',
      'Can you show me the closest grocery store?',
      'How long does it take to walk there?',
    ],
    [
      'Hello, I just moved here last week.',
      'Do you know when the recycling is collected?',
      'Is this park busy in the evening?',
      'Thank you for helping me learn the area.',
    ],
  ],
}

export const defaultSelection: PracticeSelection = {
  destination: '',
  scene: '',
  originCountry: '',
  motherLanguage: '',
  variation: 0,
}

export function buildPracticePreview(
  selection: PracticeSelection,
): PracticePreview {
  if (!selection.scene) {
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

  const phoneticStart = selection.variation % phoneticPool.length
  const phonetics = Array.from({ length: 4 }, (_, index) => {
    return phoneticPool[(phoneticStart + index) % phoneticPool.length]
  })

  if (selection.scene === 'Customized') {
    return {
      phonetics,
      payload: {
        p1: phonetics.map((entry) => [entry.symbol, entry.writing, entry.example]),
        p2: {
          sentences: [],
          tsentences: [],
        },
      },
      isUnderConstruction: true,
      isReady: false,
    }
  }

  const sentenceSet =
    sceneSentenceBundles[selection.scene][
      selection.variation % sceneSentenceBundles[selection.scene].length
    ]

  return {
    phonetics,
    payload: {
      p1: phonetics.map((entry) => [entry.symbol, entry.writing, entry.example]),
      p2: {
        sentences: sentenceSet,
        tsentences: sentenceSet.map(() => ''),
      },
    },
    isUnderConstruction: false,
    isReady: true,
  }
}
