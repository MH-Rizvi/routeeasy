import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,
        open: true,
        host: true, // Listen on all local IPs
        hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 5173,
        },
        proxy: {
            '/api': {
                target: 'http://192.168.1.168:8000',
                changeOrigin: true,
                secure: false, // Target is HTTP
            }
        }
    },
});
