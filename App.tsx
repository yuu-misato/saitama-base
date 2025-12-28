import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Lazy load pages
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Callback = lazy(() => import('./pages/auth/Callback'));

// Loading component
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white flex-col">
    <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
    <p className="text-slate-500 font-bold animate-pulse">読み込み中...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
