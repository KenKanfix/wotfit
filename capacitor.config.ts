import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.kenkanfix.wotfit',
  appName: 'WOTFit',
  webDir: 'dist',
  backgroundColor: '#09090b',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
