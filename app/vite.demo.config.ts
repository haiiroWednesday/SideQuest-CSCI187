import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ base: './', plugins: [react()], envPrefix: 'SIDEQUEST_PUBLIC_', build: { outDir: 'dist-demo', emptyOutDir: true, rollupOptions: { input: 'demo.html' } } })
