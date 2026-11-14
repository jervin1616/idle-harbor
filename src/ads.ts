// Rewarded-ad layer.
// - In the browser: shows a clearly labelled TEST ad (placeholder UI registered by ui.ts).
// - In the Android/iOS app: shows a real AdMob rewarded video (Google test ads until ADMOB.testing is switched off).
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { ADMOB } from './config';

type Presenter = () => Promise<boolean>;
let presenter: Presenter | null = null;
export const setAdPresenter = (p: Presenter) => { presenter = p; };

let ready: Promise<void> | null = null;
const init = () => (ready ??= AdMob.initialize({}));

/** Resolves true only when the player earned the reward. */
export async function showRewarded(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await init();
      await AdMob.prepareRewardVideoAd({ adId: ADMOB.rewardedUnitId, isTesting: ADMOB.testing });
      let rewarded = false;
      const handle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; });
      try { await AdMob.showRewardVideoAd(); } finally { await handle.remove(); }
      return rewarded;
    } catch { return false; }   // no ad available: no reward, no crash
  }
  return presenter ? presenter() : true;
}
