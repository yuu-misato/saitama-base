import React from 'react';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/hooks/useAuth';
import { useLineLogin } from '@/hooks/useLineLogin';
import { Navigate } from 'react-router-dom';

const Landing = () => {
    const { user, isAuthChecking } = useAuth();
    const { login } = useLineLogin();

    if (isAuthChecking) {
        if (isAuthChecking) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white flex-col">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
            );
        }
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
