import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Dashboard } from '../pages/Dashboard';
import { Speakers } from '../pages/Speakers';
import { Records } from '../pages/Records';
import { TTS } from '../pages/TTS';
import { NotFound } from '../pages/NotFound';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <Dashboard />
        },
        {
          path: 'speakers',
          element: <Speakers />
        },
        {
          path: 'records',
          element: <Records />
        },
        {
          path: 'tts',
          element: <TTS />
        },
        {
          path: '*',
          element: <NotFound />
        }
      ]
    }
  ],
  {
    future: {
      // v7_startTransition: true,
    },
  }
); 