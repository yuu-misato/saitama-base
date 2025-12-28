import { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase, getProfile, createProfile } from '../services/supabaseService';
import toast from 'react-hot-toast';

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
        const initAuth = async () => {
            let mounted = true;
            setIsAuthChecking(true);

            // 1. Check for URL Hash (OAuth Redirect)
            const hash = window.location.hash;
            const params = new URLSearchParams(window.location.search);
            const hasCode = params.has('code');

            if (hash && hash.includes('access_token')) {
                console.log('Detected generic OAuth hash, waiting for Supabase...');
                // Allow Supabase client to handle the session exchange
                const { data: { session }, error } = await supabase.auth.getSession();
                if (session && mounted) {
                    // Check if profile exists
                    const userId = session.user.id;
                    await loadUserFromId(userId, mounted);
                    setIsAuthChecking(false);
                    return;
                }
            }

            if (hasCode) {
                console.log('Detected Authoriation Code, waiting...');
                // Usually handled by Supabase automatically, but we wait just in case
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
                            return;
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
        setTempUser
    };
};
