/**
 * NPS Scene Palette — switches between dark and light themes.
 * Used by NpsScene, Ground, and other components that need theme-aware colors.
 *
 * Use the `useScenePalette()` hook inside any R3F component.
 * React Context (`useTheme`) is automatically bridged into the Canvas tree.
 */
import { useTheme } from '@/hooks/useTheme'

export interface ScenePalette {
  isDark:        boolean
  background:    string
  fog:           string
  fogDensity:    number
  ground:        string   // main ground plane
  grid:          string   // grid line color
  gridOpacity:   number
  road:          string
  fence:         string
  ambientLight:  string
  ambientIntensity: number
  sunColor:      string
  sunIntensity:  number
  fillColor:     string
  fillIntensity: number
  buildingTint:  string   // primary tint for building walls
  buildingRoof:  string
  concrete:      string
}

const DARK: ScenePalette = {
  isDark:           true,
  background:       '#0a1628',
  fog:              '#0a1628',
  fogDensity:       0.006,
  ground:           '#162338',
  grid:             '#3a5680',
  gridOpacity:      0.32,
  road:             '#1d2d44',
  fence:            '#5a7090',
  ambientLight:     '#aac0d8',
  ambientIntensity: 0.85,
  sunColor:         '#ffffff',
  sunIntensity:     1.4,
  fillColor:        '#93c5fd',
  fillIntensity:    0.4,
  buildingTint:     '#7a92ad',
  buildingRoof:     '#4a6280',
  concrete:         '#b6c2d2',
}

const LIGHT: ScenePalette = {
  isDark:           false,
  background:       '#e6eef7',
  fog:              '#dde7f1',
  fogDensity:       0.005,
  ground:           '#cdd9e6',
  grid:             '#7c93ad',
  gridOpacity:      0.28,
  road:             '#9ba9bb',
  fence:            '#5c7390',
  ambientLight:     '#ffffff',
  ambientIntensity: 0.85,
  sunColor:         '#fff8e6',
  sunIntensity:     1.5,
  fillColor:        '#dbeafe',
  fillIntensity:    0.25,
  buildingTint:     '#5c7390',
  buildingRoof:     '#3b556f',
  concrete:         '#bcc6d3',
}

/** R3F-safe hook for theme-aware scene palette. */
export function useScenePalette(): ScenePalette {
  const { theme } = useTheme()
  return theme === 'light' ? LIGHT : DARK
}

export const SCENE_PALETTE = { DARK, LIGHT }
