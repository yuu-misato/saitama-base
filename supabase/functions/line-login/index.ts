import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // 0. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Health Check
        if (req.method === 'GET') {
            return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID') || Deno.env.get('LINE_LOGIN_CHANNEL_ID');
        const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') || Deno.env.get('LINE_LOGIN_CHANNEL_SECRET');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing config:", {
                hasId: !!LINE_LOGIN_CHANNEL_ID,
                hasSecret: !!LINE_LOGIN_CHANNEL_SECRET,
                hasUrl: !!SUPABASE_URL,
                hasKey: !!SUPABASE_SERVICE_ROLE_KEY
            });
            throw new Error('Server configuration error: Missing credentials');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Parse Body safely
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error('Invalid JSON body');
        }

        const { action, code, profile_data, line_user_id, display_name, picture_url } = body;
        const redirect_uri = body.redirect_uri || body.redirectUri;

        // 2. Generate Auth URL
        if (action === 'get_auth_url') {
            const authState = crypto.randomUUID();
            const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('client_id', LINE_LOGIN_CHANNEL_ID);
            authUrl.searchParams.set('redirect_uri', redirect_uri);
            authUrl.searchParams.set('state', authState);
            authUrl.searchParams.set('scope', 'profile openid email');

            return new Response(
                JSON.stringify({ auth_url: authUrl.toString(), state: authState }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Callback Processing
        if (action === 'callback') {
            if (!code || !redirect_uri) {
                throw new Error("Missing 'code' or 'redirect_uri' in payload");
            }

            console.log("Exchanging token...", "Code present", "URI:", redirect_uri, "ID:", LINE_LOGIN_CHANNEL_ID);

            const tokenParams = new URLSearchParams();
            tokenParams.append('grant_type', 'authorization_code');
            tokenParams.append('code', code);
            tokenParams.append('redirect_uri', redirect_uri);
            tokenParams.append('client_id', LINE_LOGIN_CHANNEL_ID);
            tokenParams.append('client_secret', LINE_LOGIN_CHANNEL_SECRET);

            const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams,
            });

            if (!tokenResponse.ok) {
                const errText = await tokenResponse.text();
                console.error("LINE Token Error Body:", errText);
                throw new Error(`LINE Token Exchange Failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${errText}`);
            }

            const tokenData = await tokenResponse.json();

            const profileResponse = await fetch('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });

            if (!profileResponse.ok) {
                throw new Error('Failed to fetch LINE profile');
            }

            const lineProfile = await profileResponse.json();

            // Check existing link
            const { data: lineAccount } = await supabase
                .from('line_accounts')
                .select('user_id')
                .eq('line_user_id', lineProfile.userId)
                .maybeSingle();

            if (lineAccount) {
                const { data: user } = await supabase.auth.admin.getUserById(lineAccount.user_id);
                // If user deleted but line_account link exists, handle it? 
                // For now assume consistent.
                if (!user || !user.user) {
                    // Orphaned link?
                    throw new Error('Linked user not found');
                }

                const { data: link } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: user.user.email!,
                });

                // Update
                await supabase.from('line_accounts').update({
                    display_name: lineProfile.displayName,
                    picture_url: lineProfile.pictureUrl,
                    updated_at: new Date().toISOString()
                }).eq('line_user_id', lineProfile.userId);

                return new Response(JSON.stringify({
                    token_hash: link.properties?.hashed_token,
                    status: 'existing_user'
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

            } else {
                // New User
                return new Response(JSON.stringify({
                    status: 'new_user',
                    line_profile: {
                        line_user_id: lineProfile.userId,
                        display_name: lineProfile.displayName,
                        picture_url: lineProfile.pictureUrl
                    }
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // 6. Register
        // 6. Register
        if (action === 'register') {
            const { email, line_user_id, display_name, picture_url, nickname } = profile_data;
            const randomPassword = crypto.randomUUID();

            let userId;

            // Try to create user first
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: randomPassword,
                email_confirm: true,
                user_metadata: { nickname, avatar_url: picture_url }
            });

            if (authError) {
                // Check both English and potential localized error message or code
                if (authError.message?.includes('already been registered') || authError.status === 422 || authError.code === 'email_exists') {
                    // User exists, allow linking
                    console.log("User email exists, attempting linkage for:", email);

                    // Get existing user via generateLink (safe way to get ID by email in admin context)
                    const { data: userLinkData, error: linkError } = await supabase.auth.admin.generateLink({
                        type: 'magiclink',
                        email
                    });

                    if (linkError || !userLinkData.user) {
                        console.error("Link retrieval failed:", linkError);
                        throw new Error("Could not verify existing user for linking.");
                    }
                    userId = userLinkData.user.id;

                    // Check if this specific LINE account is already linked to ANOTHER user to prevent abuse?
                    // line_user_id check:
                    const { data: existingLineParams } = await supabase.from('line_accounts').select('user_id').eq('line_user_id', line_user_id).maybeSingle();
                    if (existingLineParams && existingLineParams.user_id !== userId) {
                        throw new Error('This LINE account is already linked to another user.');
                    }
                } else {
                    throw authError; // Real error
                }
            } else {
                userId = authData.user.id;
            }

            // Link LINE account (Upsert to be safe)
            const { error: upsertError } = await supabase.from('line_accounts').upsert({
                user_id: userId,
                line_user_id,
                display_name,
                picture_url,
                is_notification_enabled: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, line_user_id' }); // Actually PK is composite, so upsert works

            if (upsertError) {
                console.error("Line Account Upsert Error:", upsertError);
                throw new Error("Failed to link LINE account.");
            }

            // Generate session link for login
            const { data: link } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email
            });

            return new Response(JSON.stringify({
                token_hash: link.properties?.hashed_token,
                status: 'registered'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Auto Restore handling
        if (action === 'auto_restore') {
            const { data: lineAccount } = await supabase.from('line_accounts').select('user_id').eq('line_user_id', line_user_id).maybeSingle();
            if (!lineAccount) {
                return new Response(JSON.stringify({ error: 'restore_failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            const { data: user } = await supabase.auth.admin.getUserById(lineAccount.user_id);
            const { data: link } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: user.user?.email!,
            });
            return new Response(JSON.stringify({
                token_hash: link.properties?.hashed_token,
                email: user.user?.email
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 200, headers: corsHeaders });

    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown server error' }), {
            status: 200, // Always 200 for frontend error handling to avoid generic fetch error
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
