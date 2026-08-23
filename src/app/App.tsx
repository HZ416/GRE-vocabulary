import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { SettingsPage } from '../features/settings/SettingsPage'
import { VocabularyPage } from '../features/vocabulary/VocabularyPage'
import { WordDetailPage } from '../features/vocabulary/WordDetailPage'
import { StudyPage } from '../features/study/StudyPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { FlaggedVocabularyPage } from '../features/vocabulary/FlaggedVocabularyPage'
import { StatisticsPage } from '../features/stats/StatisticsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'study', element: <StudyPage /> },
      { path: 'vocabulary', element: <VocabularyPage /> },
      { path: 'vocabulary/:id', element: <WordDetailPage /> },
      { path: 'difficult', element: <FlaggedVocabularyPage flag="difficult" /> },
      { path: 'favorites', element: <FlaggedVocabularyPage flag="favorite" /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
