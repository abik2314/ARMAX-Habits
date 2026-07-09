import type { ThemeMode } from '../../types/habit'
import { LiquidToggle } from './LiquidToggle'

interface ThemeSwitcherProps {
  value: ThemeMode
  onChange: (theme: ThemeMode) => void
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Тёмная' },
  { value: 'light', label: 'Светлая' },
  { value: 'system', label: 'Система' },
]

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  return <LiquidToggle value={value} options={themeOptions} onChange={onChange} />
}
