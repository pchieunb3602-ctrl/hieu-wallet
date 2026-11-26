import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hieu.wallet',
  appName: 'Hieu Wallet',
  webDir: 'dist',
  android: { backgroundColor: '#EEF0FF' },
  plugins: {
    // Tràn viền: app tự chừa chỗ cho thanh trạng thái và thanh điều hướng qua biến CSS.
    SystemBars: { insetsHandling: 'css', style: 'DEFAULT' },
  },
};

export default config;
