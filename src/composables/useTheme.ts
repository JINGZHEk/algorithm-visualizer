import { ref, watch } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'contrast'

const STORAGE_KEY = 'algovista_theme'

function readInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'contrast') return stored
  return 'dark'
}

const theme = ref<ThemeMode>(readInitialTheme())

function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
  localStorage.setItem(STORAGE_KEY, mode)
}

export function useTheme() {
  watch(theme, applyTheme, { immediate: true })

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
  }

  return {
    theme,
    setTheme,
    themes: [
      { label: '深色', value: 'dark' },
      { label: '浅色', value: 'light' },
      { label: '高对比', value: 'contrast' },
    ] as const,
  }
}
