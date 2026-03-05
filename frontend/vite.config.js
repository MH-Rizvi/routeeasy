import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,
        open: true,
        host: true, // Listen on all local IPs
        proxy: {
            '/api': {
                target: 'http://192.168.1.168:8000',
                changeOrigin: true,
                secure: false, // Target is HTTP
            }
        }
    },
});
