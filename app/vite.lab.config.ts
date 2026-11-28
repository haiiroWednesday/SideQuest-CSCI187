import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Builds the scenario lab as a static page (for sharing a preview).
export default defineConfig({ base: './', plugins: [react()], envPrefix: 'SIDEQUEST_PUBLIC_', build: { outDir: 'dist-lab', emptyOutDir: true, rollupOptions: { input: 'scenario-lab.html' } } })
