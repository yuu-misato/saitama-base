import { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase, getProfile, createProfile } from '../services/supabaseService';


// Storage Keys
const STORAGE_KEYS = {
    USER_ID: 'saitama_user_id',
    USER_PROFILE: 'saitama_user_profile',
    USER_NICKNAME: 'saitama_user_nickname',
    PENDING_REG: 'pendingRegistration',
    AUTH_IN_PROGRESS: 'auth_in_progress',
    LOGIN_ROLE: 'loginRole'
};

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [tempUser, setTempUser] = useState<User | null>(null);

    // Initial Auth Check
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            setIsAuthChecking(true);

            // 1. Check for URL Hash (OAuth Redirect)
            const hash = window.location.hash;
            const params = new URLSearchParams(window.location.search);
            const hasCode = params.has('code');

            // If Code exists, we expect a session exchange or redirect loop.
            // Do NOT finalize auth checking to prevent fallback to LandingPage.
            if (hasCode) {
                console.log('Auth Code detected, waiting for exchange...');
                return;
            }

            if (hash && hash.includes('access_token')) {
                console.log('Detected generic OAuth hash, waiting for Supabase...');
                const { data: { session } } = await supabase.auth.getSession();
                if (session && mounted) {
                    await loadUserFromId(session.user.id, mounted);
                    setIsAuthChecking(false);
                    setIsLoading(false);
                    return;
                }
            }

            // 2. Load from LocalStorage (Persistence Strategy)
            const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
            const storedProfileJson = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);

            if (storedUserId) {
                // Priority 1: Full offline resume
                if (storedProfileJson) {
                    try {
                        const parsed = JSON.parse(storedProfileJson);
                        if (mounted) {
                            setUser(parsed);
                            setIsAuthChecking(false);
                            // SWR: Revalidate in background
                            revalidateProfile(storedUserId);
                        }
                    } catch (e) {
                        console.error('Profile parse error', e);
                    }
                }

                // Priority 2: ID exists, fetch fresh
                await loadUserFromId(storedUserId, mounted);
            } else {
                // No User
                if (mounted) setIsAuthChecking(false);
            }

            if (mounted) setIsLoading(false);
        };

        initAuth();

        // 3. Listen for Auth State Changes (Critical for OAuth / Session Recovery)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    // Only load if we don't have a user or ID mismatch
                    // But re-fetching is safer
                    await loadUserFromId(session.user.id, mounted);
                    setIsAuthChecking(false);
                    setIsLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsAuthChecking(false);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Helper: Load User by ID
    const loadUserFromId = async (userId: string, mounted: boolean) => {
        try {
            const { data: profile, error } = await getProfile(userId);
            if (profile && mounted) {
                const loadedUser: User = {
                    id: userId,
                    nickname: profile.nickname,
                    role: profile.role as any,
                    avatar: profile.avatar_url,
                    score: profile.score || 0,
                    level: profile.level || 1,
                    selectedAreas: profile.selected_areas || ['さいたま市大宮区'],
                    isLineConnected: true,
                    shopName: profile.shop_name
                };
                setUser(loadedUser);
                // Update local storage freshness
                localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(loadedUser));
            } else if (mounted) {
                // Guest / Recovery Logic can go here if distinct from App logic
            }
        } catch (e) {
            console.error('Load user failed', e);
        }
    };

    // Helper: Background Revalidation
    const revalidateProfile = async (userId: string) => {
        const { data: profile } = await getProfile(userId);
        if (profile) {
            const updatedUser: User = {
                id: userId,
                nickname: profile.nickname,
                role: profile.role as any,
                avatar: profile.avatar_url,
                score: profile.score || 0,
                level: profile.level || 1,
                selectedAreas: profile.selected_areas || ['さいたま市大宮区'],
                isLineConnected: true,
                shopName: profile.shop_name
            };
            // Silent update
            setUser(updatedUser);
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedUser));
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEYS.USER_ID);
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.USER_NICKNAME);
        // Clean absolute wipe
        sessionStorage.clear();
        setUser(null);
        window.location.href = '/';
    };

    const updateLocalUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedUser));
        localStorage.setItem(STORAGE_KEYS.USER_ID, updatedUser.id);
        if (updatedUser.nickname) {
            localStorage.setItem(STORAGE_KEYS.USER_NICKNAME, updatedUser.nickname);
        }
    };

    return {
        user,
        setUser: updateLocalUser, // Safe setter that persists
        isLoading,
        isAuthChecking,
        logout,
        tempUser,
        setTempUser,
        revalidateProfile
    };
};
