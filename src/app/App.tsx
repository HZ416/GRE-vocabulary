import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from '../components/PlaceholderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { VocabularyPage } from '../features/vocabulary/VocabularyPage'
import { WordDetailPage } from '../features/vocabulary/WordDetailPage'
import { StudyPage } from '../features/study/StudyPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <PlaceholderPage title="Dashboard" /> },
      { path: 'study', element: <StudyPage /> },
      { path: 'vocabulary', element: <VocabularyPage /> },
      { path: 'vocabulary/:id', element: <WordDetailPage /> },
      { path: 'difficult', element: <PlaceholderPage title="Difficult" /> },
      { path: 'favorites', element: <PlaceholderPage title="Favorites" /> },
      { path: 'statistics', element: <PlaceholderPage title="Statistics" /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
