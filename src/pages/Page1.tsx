import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { SceneId } from '../config/sceneBackgrounds'
import type { SceneId as SceneIdValue } from '../config/sceneBackgrounds'
import type { P2Payload } from '../types/dialogue'

const SCENE_OPTIONS: Array<{ id: SceneIdValue; label: string }> = [
    { id: SceneId.Supermarket, label: 'Supermarket' },
    { id: SceneId.Airport, label: 'Airport' },
    { id: SceneId.IRCC, label: 'IRCC' },
    { id: SceneId.NeighborhoodMeetup, label: 'Neighborhood meetup' },
    { id: SceneId.Custom, label: 'Custom' },
]

const DEMO_P2_PAYLOAD: P2Payload = {
    sentences: [
        'Excuse me, where can I find the apples?',
        'I think the bread is in aisle three.',
        'Could you help me with this price?',
        'I would like a bag of rice, please.',
        'Thank you, have a great day.',
    ],
    translations: [
        '打扰一下，请问我在哪里可以找到苹果？',
        '我觉得面包在第三条过道。',
        '你可以帮我看一下这个价格吗？',
        '我想买一袋米，谢谢。',
        '谢谢你，祝你今天愉快。',
    ],
}

function Page1() {
    const navigate = useNavigate()
    const [customBackgroundUrl, setCustomBackgroundUrl] = useState('')

    const handleStart = (sceneId: SceneIdValue) => {
        navigate(`/p2/${sceneId}`, {
            state: {
                p2: DEMO_P2_PAYLOAD,
                customBackgroundUrl:
                    sceneId === SceneId.Custom
                        ? customBackgroundUrl.trim() || undefined
                        : undefined,
            },
        })
    }

    return (
        <main style={styles.page}>
            <section style={styles.panel}>
                <h1 style={styles.title}>Select a scene</h1>
                <p style={styles.subtitle}>
                    Phase 1 route setup: choose a scene and open Page 2.
                </p>

                <label style={styles.label} htmlFor="custom-bg">
                    Custom scene URL (used only for scene id 4)
                </label>
                <input
                    id="custom-bg"
                    type="url"
                    placeholder="https://example.com/custom-scene.jpg"
                    value={customBackgroundUrl}
                    onChange={(event) => setCustomBackgroundUrl(event.target.value)}
                    style={styles.input}
                />

                <div style={styles.buttonGrid}>
                    {SCENE_OPTIONS.map((scene) => (
                        <button
                            key={scene.id}
                            type="button"
                            onClick={() => handleStart(scene.id)}
                            style={styles.button}
                        >
                            {scene.id}: {scene.label}
                        </button>
                    ))}
                </div>
            </section>
        </main>
    )
}

const styles: Record<string, CSSProperties> = {
    page: {
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#f3f4f6',
    },
    panel: {
        width: 'min(760px, 100%)',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
    },
    title: {
        margin: 0,
        fontSize: '1.8rem',
    },
    subtitle: {
        marginTop: '8px',
        color: '#4b5563',
    },
    label: {
        display: 'block',
        marginTop: '20px',
        marginBottom: '8px',
        fontWeight: 600,
    },
    input: {
        width: '100%',
        border: '1px solid #d1d5db',
        borderRadius: '10px',
        padding: '10px 12px',
        fontSize: '1rem',
    },
    buttonGrid: {
        marginTop: '16px',
        display: 'grid',
        gap: '10px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    },
    button: {
        border: 'none',
        borderRadius: '10px',
        background: '#111827',
        color: '#ffffff',
        padding: '12px',
        cursor: 'pointer',
        fontSize: '0.95rem',
    },
}

export default Page1
