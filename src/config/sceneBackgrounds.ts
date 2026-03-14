import scenePlaceholder from '../assets/hero.png'

export const SceneId = {
    Supermarket: 0,
    Airport: 1,
    IRCC: 2,
    NeighborhoodMeetup: 3,
    Custom: 4,
} as const

export type SceneId = (typeof SceneId)[keyof typeof SceneId]

// Phase 1: reuse existing local image as placeholder for built-in scenes.
// Replace these values with dedicated scene assets in a later phase.
export const SCENE_BACKGROUND_MAP: Record<number, string> = {
    [SceneId.Supermarket]: scenePlaceholder,
    [SceneId.Airport]: scenePlaceholder,
    [SceneId.IRCC]: scenePlaceholder,
    [SceneId.NeighborhoodMeetup]: scenePlaceholder,
}

export const DEFAULT_SCENE_BG = scenePlaceholder

export const resolveSceneBackground = (
    sceneId: number,
    customBackgroundUrl?: string
): string => {
    if (sceneId === SceneId.Custom && customBackgroundUrl) {
        return customBackgroundUrl
    }

    return SCENE_BACKGROUND_MAP[sceneId] ?? DEFAULT_SCENE_BG
}
