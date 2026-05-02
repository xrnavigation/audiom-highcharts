import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { audiomHighchartsDev } from 'audiom-highcharts/vite';

export default defineConfig({
  plugins: [audiomHighchartsDev()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        europe: resolve(__dirname, 'europe.html'),
        world: resolve(__dirname, 'world.html')
      }
    }
  }
});
