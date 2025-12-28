import { useCallback } from 'react';
import { logger } from '../lib/logger';

export const useLineLogin = () => {
    const login = useCallback((role: 'resident' | 'chokai_leader' | 'business' = 'resident') => {
        localStorage.setItem('loginRole', role);
        localStorage.setItem('auth_in_progress', 'true');

        // LINE Login Channel ID from user
        const clientId = '2008784970';
        const redirectUri = window.location.origin + '/auth/callback'; // Changed callback path
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('line_auth_state', state);

        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;

        logger.log('Redirecting to LINE Auth:', lineAuthUrl);
        window.location.href = lineAuthUrl;
    }, []);

    return { login };
};
