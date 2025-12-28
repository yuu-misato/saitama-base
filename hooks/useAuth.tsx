import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, getProfile } from '../services/supabaseService';
import { User } from '../types';
import { useLiffAutoAuth } from './useLiffAutoAuth';
import { useAutoSessionRestore } from './useAutoSessionRestore';
import { logger } from '../lib/logger';

interface AuthContextType {
    user: User | null;
    setUser: (user: User) => void;
    isLoading: boolean;
    isAuthChecking: boolean;
    isLiffRestoring: boolean;
    logout: () => Promise<void>;
    tempUser: User | null;
    setTempUser: (user: User | null) => void;
    revalidateProfile: () => Promise<void>;
    checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [tempUser, setTempUser] = useState<User | null>(null);

    // Helper to load profile
    const loadProfile = async (userId: string) => {
        try {
            const { data } = await getProfile(userId);
            if (data) {
                const u: User = {
                    id: userId,
                    nickname: data.nickname,
                    role: data.role as any,
                    avatar: data.avatar_url,
                    score: data.score || 0,
                    level: data.level || 1,
                    selectedAreas: data.selected_areas || ['さいたま市大宮区'],
                    isLineConnected: true,
                    shopName: data.shop_name
                };
                setUser(u);
                localStorage.setItem('saitama_user_profile', JSON.stringify(u));
            }
        } catch (e) {
            logger.error('Load profile failed', e);
        }
    };

    const handleSessionRestored = useCallback(() => {
        logger.log('Session restored callback');
        checkSession();
    }, []);

    const { isRestoring: isLiffRestoring, isLiffProcessing } = useLiffAutoAuth(
        !!session,
        handleSessionRestored
    );

    const { isRestoring: isAutoRestoring } = useAutoSessionRestore(!!session);

    const checkSession = async () => {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        if (s) {
            await loadProfile(s.user.id);
        }
        setIsAuthChecking(false);
        setIsLoading(false);
    };

    useEffect(() => {
        // Init from local storage if available for faster render
        const stored = localStorage.getItem('saitama_user_profile');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                // ignore
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            logger.log('Auth State Change:', event);
            setSession(session);
            if (session) {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                    await loadProfile(session.user.id);
                }
            } else {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                }
            }
            setIsAuthChecking(false);
            setIsLoading(false);
        });

        checkSession();

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('linked_line_user_id');
        localStorage.removeItem('saitama_user_profile');
        setUser(null);
        setSession(null);
        window.location.href = '/';
    };

    const revalidateProfile = async () => {
        if (user) await loadProfile(user.id);
    };

    // Combine loading states
    // If isLiffProcessing is true, we block UI (isAuthChecking = true)
    const effectiveIsAuthChecking = isAuthChecking || isLiffProcessing || ((isLiffRestoring || isAutoRestoring) && !session);

    return (
        <AuthContext.Provider value={{
            user,
            setUser: (u) => { setUser(u); localStorage.setItem('saitama_user_profile', JSON.stringify(u)); },
            isLoading,
            isAuthChecking: effectiveIsAuthChecking,
            isLiffRestoring,
            logout,
            tempUser,
            setTempUser,
            revalidateProfile,
            checkSession
        }}>
            {children}
        </AuthContext.Provider>
    );
};
