import { lazy, Suspense, useEffect, useState } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import { PublicRoute, ProtectedRoute, OnboardingRoute, AdminRoute } from './router/guards';
import { initAuth } from './hooks/useAuth';
import { useI18n } from './i18n/useI18n';

const Login = lazy(() => import('./components/auth/Login'));
const Signup = lazy(() => import('./components/auth/Signup'));
const TwoFactorChallenge = lazy(() => import('./components/auth/TwoFactorChallenge'));
const OnboardingFlow = lazy(() => import('./components/auth/OnboardingFlow'));
const Dashboard = lazy(() => import('./components/user/Dashboard/Dashboard'));
const Workouts = lazy(() => import('./components/user/Workouts/Workouts'));
const NutritionLayout = lazy(() => import('./components/user/Nutrition/Layout/NutritionLayout'));
const NutritionDashboard = lazy(() => import('./components/user/Nutrition/Dashboard/Nutrition'));
const NutritionHistory = lazy(() => import('./components/user/Nutrition/History/NutritionHistory'));
const FoodSearch = lazy(() => import('./components/user/Nutrition/FoodSearch/FoodSearch'));
const AddQuantity = lazy(() => import('./components/user/Nutrition/AddQuantity/AddQuantity'));
const CreateRecipe = lazy(() => import('./components/user/Nutrition/CreateRecipe/CreateRecipe'));
const CustomFood = lazy(() => import('./components/user/Nutrition/CustomFood/CustomFood'));
const AIAssistant = lazy(() => import('./components/user/AIAssistant/AIAssistant'));
const Settings = lazy(() => import('./components/user/Settings/Settings'));
const PrivacyPolicy = lazy(() => import('./components/user/Settings/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/user/Settings/TermsOfService'));
const NotificationsCenter = lazy(() => import('./components/user/Notifications/NotificationsCenter'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('./components/admin/AdminUserManagement'));
const AdminExerciseLibrary = lazy(() => import('./components/admin/AdminExerciseLibrary'));
const AdminUserPrograms = lazy(() => import('./components/admin/AdminUserPrograms'));
const AdminNutrition = lazy(() => import('./components/admin/Nutrition/AdminNutrition'));

function lazyElement(Component) {
  const Screen = Component;
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}

function RouteErrorBoundary() {
  const error = useRouteError();
  const { t } = useI18n();

  let title = t('routeError.title');
  let message = t('routeError.message');

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = typeof error.data === 'string' ? error.data : message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f6f2ea' }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#fff', border: '1px solid #e8e2d6', borderRadius: 24, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <p style={{ margin: 0, color: '#38671a', fontWeight: 700, letterSpacing: '0.08em' }}>UM6P_FIT</p>
        <h1 style={{ margin: '12px 0 8px', fontSize: 28 }}>{title}</h1>
        <p style={{ margin: 0, color: '#5b5c5a', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ border: 0, borderRadius: 999, background: '#38671a', color: '#fff', padding: '12px 16px', cursor: 'pointer' }}
          >
            {t('common.actions.reloadPage')}
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            style={{ borderRadius: 999, border: '1px solid #d7d0c5', background: '#fff', color: '#2b2c2a', padding: '12px 16px', cursor: 'pointer' }}
          >
            {t('common.actions.goToDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <Navigate to="/login" replace /> },
      { path: '/privacy', element: lazyElement(PrivacyPolicy) },
      { path: '/terms', element: lazyElement(TermsOfService) },

      {
        element: <PublicRoute />,
        children: [
          { path: '/login', element: lazyElement(Login) },
          { path: '/signup', element: lazyElement(Signup) },
          { path: '/2fa-challenge', element: lazyElement(TwoFactorChallenge) },
        ],
      },

      {
        element: <OnboardingRoute />,
        children: [
          { path: '/onboarding', element: lazyElement(OnboardingFlow) },
        ],
      },

      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: lazyElement(Dashboard) },
          { path: '/workouts', element: lazyElement(Workouts) },
          { path: '/workouts/library', element: lazyElement(Workouts) },
          { path: '/workouts/history', element: lazyElement(Workouts) },
{ path: '/leaderboard', element: <Navigate to="/dashboard" replace /> },
          { path: '/notifications', element: lazyElement(NotificationsCenter) },
          {
            path: '/nutrition',
            element: lazyElement(NutritionLayout),
            children: [
              { index: true, element: lazyElement(NutritionDashboard) },
              { path: 'history', element: lazyElement(NutritionHistory) },
              { path: 'food-search', element: lazyElement(FoodSearch) },
              { path: 'add-quantity', element: lazyElement(AddQuantity) },
              { path: 'recipe', element: lazyElement(CreateRecipe) },
              { path: 'custom-food', element: lazyElement(CustomFood) },
            ],
          },
          { path: '/ai', element: lazyElement(AIAssistant) },
          { path: '/settings', element: lazyElement(Settings) },
        ],
      },

      {
        element: <AdminRoute />,
        children: [
          {
            path: '/admin',
            element: lazyElement(AdminLayout),
            children: [
              { index: true, element: lazyElement(AdminDashboard) },
              { path: 'users', element: lazyElement(AdminUserManagement) },
              { path: 'exercises', element: lazyElement(AdminExerciseLibrary) },
              { path: 'programs', element: lazyElement(AdminUserPrograms) },
              { path: 'nutrition', element: lazyElement(AdminNutrition) },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return <RouterProvider router={router} />;
}
