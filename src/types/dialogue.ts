export type P2Payload = {
    sentences: string[]
    translations: string[]
}

export type Page2RouteState = {
    p2?: P2Payload
    customBackgroundUrl?: string
}
