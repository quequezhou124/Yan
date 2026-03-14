type SceneCanvasProps = {
    imageUrl: string
}

function SceneCanvas({ imageUrl }: SceneCanvasProps) {
    return (
        <div className="p2-scene-canvas" aria-hidden="true">
            <img className="p2-scene-image" src={imageUrl} alt="" />
            <div className="p2-scene-scrim" />
        </div>
    )
}

export default SceneCanvas
