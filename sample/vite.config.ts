import { defineConfig } from 'vite';
import { audiomHighchartsDev } from 'audiom-highcharts/vite';

export default defineConfig({
  plugins: [audiomHighchartsDev()],
  server: {
    port: 5173,
    open: true
  }
});
