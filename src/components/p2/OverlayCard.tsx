import type { PropsWithChildren } from 'react'

function OverlayCard({ children }: PropsWithChildren) {
    return <section className="p2-overlay-card">{children}</section>
}

export default OverlayCard
