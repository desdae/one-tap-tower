import { Capacitor } from '@capacitor/core';

export function createPlatform() {
  const isNative = Capacitor.isNativePlatform();

  return {
    isNative,
    isBrowser: !isNative,
    bindLifecycle({ onPause, onResume }) {
      let hidden = document.hidden;

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && !hidden) {
          hidden = true;
          onPause();
          return;
        }

        if (!document.hidden && hidden) {
          hidden = false;
          onResume();
        }
      });
    }
  };
}
