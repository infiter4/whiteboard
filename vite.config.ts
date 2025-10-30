import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      'framer-motion',
      'zustand'
    ],
    exclude: ['lucide-react'],
  },
  server: {
    fs: {
      strict: false,
    },
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    target: 'es2020',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          ui: ['framer-motion', '@headlessui/react'],
        },
      },
    },
  },
});
