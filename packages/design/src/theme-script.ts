export const THEME_STORAGE_KEY = 'tf-theme';
/** Fired on `window` after `applyTheme` so every island showing the theme re-reads it. */
export const THEME_CHANGE_EVENT = 'tf-theme-change';

/**
 * Runs before first paint, and again after an Astro client-router swap —
 * which replaces every attribute on `<html>` inside the view transition's
 * update, so the theme has to be back before the new state is captured.
 */
export const themeBootScript = `(function(){function a(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var v=t==='light'||t==='dark'?t:'system';var r=document.documentElement;r.dataset.theme=v;r.style.colorScheme=v==='system'?'light dark':v;}catch(e){document.documentElement.style.colorScheme='light dark';}}a();document.addEventListener('astro:after-swap',a);})();`;

export type ThemePreference = 'system' | 'light' | 'dark';

export function readTheme(): ThemePreference {
  if (typeof localStorage === 'undefined') {
    return 'system';
  }
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'system' ? 'light dark' : theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** For `useSyncExternalStore`: this tab's own changes and another tab's. */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
