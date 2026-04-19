import { useEffect } from 'react';

export type ThemeId = 'blueprint';

export function useTheme() {
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'blueprint');
    html.classList.remove('dark');
  }, []);

  return {
    theme: 'blueprint' as ThemeId,
    isDark: false,
  };
}
