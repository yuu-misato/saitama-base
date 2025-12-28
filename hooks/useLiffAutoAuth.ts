import { useEffect, useMemo, useState } from "react";
import {
    getLiffAccessToken,
    getLiffProfile,
    initLiff,
    isInLineApp,
    isLiffLoggedIn,
    liffLogin,
} from "../lib/liff";
import { supabase } from "../services/supabaseService";

// USER Provided LIFF ID (from reference project)
const LIFF_ID = "2008600703-aNmdY4Nq";
const LIFF_BASE_URL = `https://liff.line.me/${LIFF_ID}`;

interface LiffAutoAuthResult {
    isLiffInitialized: boolean;
    isInLiff: boolean;
    isLiffLoggedIn: boolean;
    isRestoring: boolean;
    isLiffProcessing: boolean;
    error: string | null;
}

// Public pages that don't require LIFF login
// Adjust paths for this project
const PUBLIC_PATHS = ["/", "/auth/line/callback", "/terms"];

const getLiffState = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("liff.state");
    if (!raw) return null;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
};

const getEffectivePathnameForAccessControl = (): string => {
    const state = getLiffState();
    if (state && state.startsWith("/")) {
        return state.split("?")[0];
    }
    return window.location.pathname;
};

const getEffectiveTargetForRedirect = (): string => {
    const state = getLiffState();
    if (state && state.startsWith("/")) return state;
    return `${window.location.pathname}${window.location.search}`;
};

const isPublicPath = (path: string) => {
    return PUBLIC_PATHS.includes(path) || path.startsWith("/public-");
};

export const useLiffAutoAuth = (
    hasSupabaseSession: boolean,
    onSessionRestored: () => void
): LiffAutoAuthResult => {
    const [isLiffInitialized, setIsLiffInitialized] = useState(false);
    const [isInLiff, setIsInLiff] = useState(false);
    const [isLiffUserLoggedIn, setIsLiffUserLoggedIn] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAttemptedRestore, setHasAttemptedRestore] = useState(false);
    const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

    // LIFF経由で /?liff.state=... になっても、public扱いでスキップしないため
    const initialProcessing = useMemo(() => {
        const effectivePath = getEffectivePathnameForAccessControl();
        const looksLikeLiff = !!getLiffState();
        return looksLikeLiff && !isPublicPath(effectivePath);
    }, []);

    const [isLiffProcessing, setIsLiffProcessing] = useState<boolean>(initialProcessing);

    // Initialize LIFF on mount
    useEffect(() => {
        const initialize = async () => {
            if (!LIFF_ID) {
                setIsLiffProcessing(false);
                return;
            }

            try {
                const success = await initLiff(LIFF_ID);
                if (!success) {
                    setIsLiffProcessing(false);
                    return;
                }

                setIsLiffInitialized(true);
                const inLine = isInLineApp();
                const loggedIn = isLiffLoggedIn();
                setIsInLiff(inLine);
                setIsLiffUserLoggedIn(loggedIn);

                // そもそもLINEアプリ内でなければ自動処理は終了
                if (!inLine) {
                    setIsLiffProcessing(false);
                    return;
                }

                // 有効パスがpublicなら処理しない
                const effectivePath = getEffectivePathnameForAccessControl();
                if (isPublicPath(effectivePath)) {
                    setIsLiffProcessing(false);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "LIFF init failed");
                setIsLiffProcessing(false);
            }
        };

        initialize();
    }, []);

    // Auto-login or restore session when LIFF is ready
    useEffect(() => {
        const handleAuth = async () => {
            const effectivePath = getEffectivePathnameForAccessControl();

            // Skip for public pages (effective)
            if (isPublicPath(effectivePath)) {
                setIsLiffProcessing(false);
                return;
            }

            // Already signed in
            if (hasSupabaseSession) {
                setIsLiffProcessing(false);
                return;
            }

            // Wait for LIFF init
            if (!isLiffInitialized) return;

            // Not in LINE client => don't attempt LIFF login
            if (!isInLiff) {
                setIsLiffProcessing(false);
                return;
            }

            // If LIFF is not logged in, trigger LIFF login (only once)
            if (!isLiffUserLoggedIn && !hasAttemptedLogin) {
                setHasAttemptedLogin(true);

                // IMPORTANT: use LIFF URL + intended path (including query) so post-login lands correctly
                const target = getEffectiveTargetForRedirect();
                const redirectUri = `${LIFF_BASE_URL}${target}`;
                liffLogin(redirectUri);
                return;
            }

            // If LIFF is logged in but no Supabase session, restore session
            if (isLiffUserLoggedIn && !hasAttemptedRestore) {
                setIsRestoring(true);
                setHasAttemptedRestore(true);

                try {
                    const accessToken = getLiffAccessToken();
                    const profile = await getLiffProfile();

                    if (!accessToken || !profile) {
                        setIsLiffProcessing(false);
                        return;
                    }

                    console.log('[LIFF] Invoking line-login with liff_access_token');
                    const { data, error: fnError } = await supabase.functions.invoke("line-login", {
                        body: {
                            action: "liff_login",
                            liff_access_token: accessToken,
                            line_user_id: profile.userId,
                            display_name: profile.displayName,
                            picture_url: profile.pictureUrl,
                        },
                    });

                    if (fnError) {
                        console.error('[LIFF] line-login invocation failed:', fnError);
                        setError(fnError.message);
                        setIsLiffProcessing(false);
                        return;
                    }

                    if (data?.error) {
                        console.error('[LIFF] line-login returned error:', data.error);
                        setError(data.error);
                        setIsLiffProcessing(false);
                        return;
                    }

                    // Existing user - verify OTP to create session using token_hash
                    if (data?.token_hash) {
                        console.log('[LIFF] Got token_hash, verifying OTP...');
                        const { error: otpError } = await supabase.auth.verifyOtp({
                            token_hash: data.token_hash,
                            type: "magiclink",
                        });

                        if (otpError) {
                            console.error('[LIFF] verifyOtp failed:', otpError);
                            setError(otpError.message);
                        } else {
                            console.log('[LIFF] Session restored successfully.');
                            localStorage.setItem("linked_line_user_id", profile.userId);
                            onSessionRestored();
                        }
                    } else {
                        console.log('[LIFF] No token_hash returned (maybe new user or status flow).', data);
                    }
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Auto-restore failed");
                } finally {
                    setIsRestoring(false);
                    setIsLiffProcessing(false);
                }
            }
        };

        handleAuth();
    }, [
        hasSupabaseSession,
        hasAttemptedLogin,
        hasAttemptedRestore,
        isInLiff,
        isLiffInitialized,
        isLiffUserLoggedIn,
        onSessionRestored,
    ]);

    return {
        isLiffInitialized,
        isInLiff,
        isLiffLoggedIn: isLiffUserLoggedIn,
        isRestoring,
        isLiffProcessing,
        error,
    };
};
