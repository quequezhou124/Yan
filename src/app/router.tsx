import { createBrowserRouter } from 'react-router-dom'
import Page1 from '../pages/Page1'
import Page2Dialogue from '../pages/Page2Dialogue'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Page1 />,
    },
    {
        path: '/p2/:sceneId',
        element: <Page2Dialogue />,
    },
])
