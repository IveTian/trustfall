export const THEME_STORAGE_KEY = 'tf-theme';

export const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var v=t==='light'||t==='dark'?t:'system';var r=document.documentElement;r.dataset.theme=v;r.style.colorScheme=v==='system'?'light dark':v;}catch(e){document.documentElement.style.colorScheme='light dark';}})();`;

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
}
