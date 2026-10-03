import type { Theme, WorkspaceOptions } from '@danfessler/trellis'

export type DemoTheme = 'app' | 'light' | 'medium' | 'dark' | 'darker'
export type DemoNavigation = 'focus' | 'free'

export interface TrellisStyleSettings {
  theme: DemoTheme
  accent: string | null
  gap: number
  radius: number
  tabbarHeight: number
  tabInset: number
  fillTabs: boolean
  motion: 'system' | 'full' | 'reduced'
  navigation: DemoNavigation
}

const STORAGE_KEY = 'beast-dashboard-trellis-style'

export const defaultTrellisStyle: TrellisStyleSettings = {
  theme: 'app',
  accent: null,
  gap: 1,
  radius: 6,
  tabbarHeight: 40,
  tabInset: 4,
  fillTabs: false,
  motion: 'system',
  navigation: 'focus'
}

export const compactTrellisStyle: TrellisStyleSettings = {
  ...defaultTrellisStyle,
  gap: 0,
  radius: 2,
  tabbarHeight: 30,
  tabInset: 0,
  fillTabs: true
}

export const spaciousTrellisStyle: TrellisStyleSettings = {
  ...defaultTrellisStyle,
  gap: 10,
  radius: 16,
  tabbarHeight: 44,
  tabInset: 8
}

const isChoice = <T extends string>(value: unknown, choices: readonly T[]): value is T =>
  typeof value === 'string' && choices.includes(value as T)

const boundedNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback

export function loadTrellisStyle(): TrellisStyleSettings {
  if (typeof window === 'undefined') return defaultTrellisStyle
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved === null || typeof saved !== 'object') return defaultTrellisStyle
    const value = saved as Record<string, unknown>
    return {
      theme: isChoice(value.theme, ['app', 'light', 'medium', 'dark', 'darker'])
        ? value.theme
        : defaultTrellisStyle.theme,
      accent: typeof value.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.accent) ? value.accent : null,
      gap: boundedNumber(value.gap, defaultTrellisStyle.gap, 0, 16),
      radius: boundedNumber(value.radius, defaultTrellisStyle.radius, 0, 24),
      tabbarHeight: boundedNumber(value.tabbarHeight, defaultTrellisStyle.tabbarHeight, 28, 56),
      tabInset: boundedNumber(value.tabInset, defaultTrellisStyle.tabInset, 0, 12),
      fillTabs: typeof value.fillTabs === 'boolean' ? value.fillTabs : defaultTrellisStyle.fillTabs,
      motion: isChoice(value.motion, ['system', 'full', 'reduced']) ? value.motion : defaultTrellisStyle.motion,
      navigation: isChoice(value.navigation, ['focus', 'free']) ? value.navigation : defaultTrellisStyle.navigation
    }
  } catch {
    return defaultTrellisStyle
  }
}

export function saveTrellisStyle(style: TrellisStyleSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(style))
  } catch {
    // The controls still work when storage is unavailable.
  }
}

export function trellisStyleOptions(
  style: TrellisStyleSettings,
  appTheme: 'light' | 'dark'
): Pick<WorkspaceOptions, 'theme' | 'tokens' | 'tabs' | 'motion' | 'navigation'> {
  const theme: Theme = style.theme === 'app' ? (appTheme === 'dark' ? 'medium' : appTheme) : style.theme
  return {
    theme,
    tokens: {
      ...(style.accent ? { '--trellis-accent': style.accent } : {}),
      '--trellis-gap': `${style.gap}px`,
      '--trellis-radius': `${style.radius}px`,
      '--trellis-tab-radius': `${Math.max(0, style.radius - 2)}px`,
      '--trellis-tabbar-height': `${style.tabbarHeight}px`
    },
    tabs: { fill: style.fillTabs, inset: style.tabInset },
    motion: style.motion,
    navigation: style.navigation
  }
}
