import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const backendIp = env.VITE_BACKEND_IP || '127.0.0.1'
    const backendPort = env.VITE_BACKEND_PORT || '8000'

    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api/v1': {
                    target: `http://${backendIp}:${backendPort}`,
                    changeOrigin: true,
                },
            },
        },
    }
})
