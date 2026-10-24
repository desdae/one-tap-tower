import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Short buzzes per drop result. Native uses the Capacitor plugin; browsers fall back to navigator.vibrate.
export function createHaptics({ platform, haptics = Haptics, nav = globalThis.navigator, enabled = true } = {}) {
  let isEnabled = enabled;

  function vibrate(pattern) {
    if (nav && typeof nav.vibrate === 'function') {
      nav.vibrate(pattern);
    }
  }

  function run(nativeCall, pattern) {
    if (!isEnabled) {
      return;
    }
    if (platform?.isNative) {
      Promise.resolve()
        .then(nativeCall)
        .catch(() => {});
      return;
    }
    vibrate(pattern);
  }

  return {
    setEnabled(value) {
      isEnabled = Boolean(value);
    },
    isEnabled() {
      return isEnabled;
    },
    place() {
      run(() => haptics.impact({ style: ImpactStyle.Light }), 12);
    },
    cut() {
      run(() => haptics.impact({ style: ImpactStyle.Medium }), 20);
    },
    perfect(streak = 1) {
      run(
        () => (streak >= 3 ? haptics.notification({ type: NotificationType.Success }) : haptics.impact({ style: ImpactStyle.Heavy })),
        streak >= 3 ? [18, 40, 24] : 26
      );
    },
    milestone() {
      run(() => haptics.notification({ type: NotificationType.Success }), [20, 50, 20, 50, 40]);
    },
    miss() {
      run(() => haptics.notification({ type: NotificationType.Error }), [40, 30, 60]);
    }
  };
}
