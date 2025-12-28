import React from 'react';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/hooks/useAuth';
import { useLineLogin } from '@/hooks/useLineLogin';
import { Navigate } from 'react-router-dom';

const Landing = () => {
    const { user, isAuthChecking } = useAuth();
    const { login } = useLineLogin();

    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white flex-col">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-slate-500 font-bold animate-pulse">Checking session...</p>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handlePreRegister = (nickname: string, areas: string[]) => {
        localStorage.setItem('pendingRegistration', JSON.stringify({ nickname, areas }));
        login('resident');
    };

    return (
        <LandingPage
            onLogin={() => login('resident')}
            onPreRegister={handlePreRegister}
        />
    );
};

export default Landing;
