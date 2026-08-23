import { NavLink, Outlet } from 'react-router-dom'

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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GRE Vocabulary</strong>
            <small>Local-first learning</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, path]) => (
            <NavLink key={path} to={path}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  )
}

