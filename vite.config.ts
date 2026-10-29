import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // กำหนด Base path เป็น relative เพื่อให้ทำงานได้ทั้งใน IIS (/Procurement/) และ Preview
  base: './', 
  server: {
    port: 3000,
    host: true,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
    // เพิ่ม limit แจ้งเตือนเป็น 1000kB (1MB) เพื่อลด warning สีเหลือง
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        // แยกไฟล์ Library ออกจาก Code หลัก เพื่อโหลดเร็วขึ้น
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('lucide')) {
              return 'icons';
            }
            return 'vendor';
          }
        }
      }
    },
  }
})