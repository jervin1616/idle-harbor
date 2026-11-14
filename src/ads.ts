// Rewarded-ad layer. In the browser (and until the Android build exists) it shows a clearly labelled TEST ad.
// When the Capacitor AdMob plugin is added, replace the body of showRewarded() with the real call
// (use Google's TEST ad unit ids while developing; never tap your own live ads).
type Presenter = () => Promise<boolean>;
let presenter: Presenter | null = null;
export const setAdPresenter = (p: Presenter) => { presenter = p; };

/** Resolves true when the player should receive the reward. */
export async function showRewarded(): Promise<boolean> {
  // const admob = (window as any).Capacitor?.Plugins?.AdMob;  // <- real ads go here later
  return presenter ? presenter() : true;
}
