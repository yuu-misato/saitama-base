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
    const [email, setEmail] = useState('');
    const [lineProfile, setLineProfile] = useState<any>(null); // Use any or proper type if available

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

                // DIRECT DEBUGGING: Use fetch to see raw error
                const functionUrl = 'https://kykuokxmukjvlytufjtt.supabase.co/functions/v1/line-login';

                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'callback',
                        code,
                        redirect_uri: redirectUri
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server Error (${response.status}): ${errorText}`);
                }

                const data = await response.json();

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
                } else if (data?.status === 'new_user') {
                    setStatus('new_user');
                    setLineProfile(data.line_profile);
                } else {
                    throw new Error('No session token returned');
                }
            } catch (err: any) {
                logger.error('Login Callback Error:', err);
                setError(err.message || 'Login failed');
            }
        };

        handleCallback();
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !lineProfile) return;

        setStatus('Registering...');
        try {
            // DIRECT DEBUGGING
            const functionUrl = 'https://kykuokxmukjvlytufjtt.supabase.co/functions/v1/line-login';

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'register',
                    profile_data: {
                        email,
                        line_user_id: lineProfile.line_user_id,
                        display_name: lineProfile.display_name,
                        picture_url: lineProfile.picture_url,
                        nickname: lineProfile.display_name, // Use display name as nickname
                        area: '未設定' // Default area
                    }
                })
            });

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`Register Failed: ${txt}`);
            }
            const data = await response.json();

            if (data?.error) throw new Error(data.error);

            if (data?.token_hash) {
                const { error: otpError } = await supabase.auth.verifyOtp({
                    token_hash: data.token_hash,
                    type: 'magiclink'
                });
                if (otpError) throw otpError;

                await checkSession();
                navigate('/dashboard', { replace: true });
            } else {
                throw new Error('Registration failed: No session returned');
            }

        } catch (err: any) {
            setError(err.message);
            setStatus('new_user'); // Revert to form
        }
    };

    if (status === 'new_user' && lineProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white flex-col p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                    <div className="text-center mb-6">
                        <img src={lineProfile.picture_url} alt="Profile" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-indigo-50" />
                        <h2 className="text-2xl font-bold text-slate-800">はじめまして！</h2>
                        <p className="text-slate-600 mt-2">{lineProfile.display_name}さん</p>
                        <p className="text-slate-500 text-sm mt-1">アカウント作成のためにメールアドレスを入力してください</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="name@example.com"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#00B900] hover:bg-[#00A000] text-white font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            <span>アカウントを作成してログイン</span>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 flex-col p-4 text-center">
                <div className="text-red-500 font-bold mb-2">Login Failed</div>
                <div className="text-sm text-slate-600 mb-4 bg-white p-4 rounded shadow border border-red-100 max-w-lg break-all">
                    {error}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition shadow-sm"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition shadow-sm"
                    >
                        Back to Home
                    </button>
                </div>
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
