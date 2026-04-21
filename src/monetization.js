function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function createMonetization({ platform, storage }) {
  let removeAdsOwned = storage.getRemoveAds();

  return {
    hasRemoveAds() {
      return removeAdsOwned;
    },

    canOfferContinue(game) {
      return game.canContinue() && platform.isBrowser;
    },

    async showRewardedContinue() {
      if (platform.isBrowser) {
        await wait(900);
        return true;
      }

      // TODO(native): wire a rewarded ad provider such as AdMob and resolve true only after a
      // verified reward callback from the SDK.
      return false;
    },

    async purchaseRemoveAds() {
      if (platform.isBrowser) {
        await wait(250);
        removeAdsOwned = true;
        storage.setRemoveAds(true);
        return {
          success: true,
          owned: true,
          simulated: true
        };
      }

      // TODO(native): replace this stub with Google Play Billing one-time purchase handling.
      return {
        success: false,
        owned: removeAdsOwned,
        simulated: false
      };
    }
  };
}
