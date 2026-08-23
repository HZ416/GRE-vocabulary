import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSettingsStore } from '../features/settings/settingsStore'

const navigation = [
  ['Dashboard', '/dashboard'],
  ['Study', '/study'],
  ['Vocabulary', '/vocabulary'],
  ['Difficult', '/difficult'],
  ['Favorites', '/favorites'],
  ['Statistics', '/statistics'],
  ['Settings', '/settings'],
] as const

export function AppShell() {
  const { t } = useI18n()
  const loadSettings = useSettingsStore((state) => state.load)
  useEffect(() => { void loadSettings() }, [loadSettings])
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GRE Vocabulary</strong>
            <small>{t('Local-first learning')}</small>
          </div>
        </div>
        <nav aria-label={t('Primary navigation')}>
          {navigation.map(([label, path]) => (
            <NavLink key={path} to={path}>
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  )
}
