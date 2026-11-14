// Real-money purchases.
// TEST MODE: no money moves. The UI shows a clearly labelled test confirmation, then the items are granted.
// Before launch: set PAYMENTS.testMode to false and implement the Google Play Billing call in purchase()
// (e.g. via a Capacitor in-app-purchase plugin) so that it only resolves true after Google confirms payment.
export const PAYMENTS = { testMode: true };

type Presenter = (productName: string, price: string) => Promise<boolean>;
let presenter: Presenter | null = null;
export const setPurchasePresenter = (p: Presenter) => { presenter = p; };

export async function purchase(productName: string, price: string): Promise<boolean> {
  if (PAYMENTS.testMode) return presenter ? presenter(productName, price) : true;
  return false;   // real billing not wired up yet: never grant anything for free in production
}
