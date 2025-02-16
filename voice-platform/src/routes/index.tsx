import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Dashboard } from '../pages/Dashboard';

// Lazy load components
const Speakers = lazy(() => import('../pages/Speakers').then(module => ({ default: module.Speakers })));
const Records = lazy(() => import('../pages/Records').then(module => ({ default: module.Records })));
const TTS = lazy(() => import('../pages/TTS').then(module => ({ default: module.TTS })));
const NotFound = lazy(() => import('../pages/NotFound').then(module => ({ default: module.NotFound })));

// Loading component
const LoadingComponent = () => <div>Loading...</div>;

export const router = createBrowserRouter(
  [
    {
      path: '/page',
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <Dashboard />
        },
        {
          path: '/page/speakers',
          element: (
            <Suspense fallback={<LoadingComponent />}>
              <Speakers />
            </Suspense>
          )
        },
        {
          path: '/page/records',
          element: (
            <Suspense fallback={<LoadingComponent />}>
              <Records />
            </Suspense>
          )
        },
        {
          path: '/page/tts',
          element: (
            <Suspense fallback={<LoadingComponent />}>
              <TTS />
            </Suspense>
          )
        },
        {
          path: '/page/*',
          element: (
            <Suspense fallback={<LoadingComponent />}>
              <NotFound />
            </Suspense>
          )
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