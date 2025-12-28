import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/services/supabaseService';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

const Callback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { checkSession } = useAuth();
    const [status, setStatus] = useState('Processing login...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');

            if (!code || !state) {
                setError('Invalid callback parameters');
                return;
            }

            try {
                const redirectUri = window.location.origin + '/auth/callback';

                logger.log('Processing callback with code:', code);

                const { data, error: fnError } = await supabase.functions.invoke('line-login', {
                    body: {
                        action: 'callback',
                        code,
                        redirectUri
                    },
                });

                if (fnError) throw fnError;
                if (data?.error) throw new Error(data.error);

                if (data?.token_hash) {
                    const { error: otpError } = await supabase.auth.verifyOtp({
                        token_hash: data.token_hash,
                        type: 'magiclink'
                    });

                    if (otpError) throw otpError;

                    logger.log('Session verified, updating auth context...');
                    await checkSession(); // Force update context

                    navigate('/dashboard', { replace: true });
                } else {
                    throw new Error('No session token returned');
                }
            } catch (err: any) {
                logger.error('Login Callback Error:', err);
                setError(err.message || 'Login failed');
                setTimeout(() => navigate('/', { replace: true }), 3000);
            }
        };

        handleCallback();
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 flex-col p-4 text-center">
                <div className="text-red-500 font-bold mb-2">Login Failed</div>
                <div className="text-sm text-slate-600 mb-4">{error}</div>
                <p className="text-xs text-slate-400">Redirecting to home...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white flex-col">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-slate-500 font-bold animate-pulse">{status}</p>
        </div>
    );
};

export default Callback;
