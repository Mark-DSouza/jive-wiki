import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this as a project site at /jive-wiki/, not the domain root.
export default defineConfig({
  base: '/jive-wiki/',
  plugins: [react()],
})
