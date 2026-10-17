/** Tiny global toast: showToast('Saved') from anywhere; <Toast /> renders it. */
export const TOAST_EVENT = 'cumeals-toast';
export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}
