import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 🧪 Vite runs the React development app; Vitest reuses this config
// to find unit and integration test files in the tests/ folder.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // Model/Controller tests run in Node. React tests opt into jsdom
    // using their @vitest-environment jsdom comment at the top of the file.
    environment: 'node',
  },
})
