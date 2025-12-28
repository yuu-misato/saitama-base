import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID') || Deno.env.get('LINE_LOGIN_CHANNEL_ID');
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') || Deno.env.get('LINE_LOGIN_CHANNEL_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
    // 0. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Health Check (GET)
        if (req.method === 'GET') {
            return new Response(JSON.stringify({
                status: 'operational',
                timestamp: new Date().toISOString()
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 1. Env Var Check
        if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing credentials");
            throw new Error("Server configuration error: Missing LINE or Supabase credentials.");
        }

        const body = await req.json();
        const { action, code, profile_data, line_user_id, display_name, picture_url } = body;

        // Normalize redirect_uri (accept both snake_case and camelCase)
        const redirect_uri = body.redirect_uri || body.redirectUri;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
            if (!code) throw new Error("Missing 'code' parameter");
            if (!redirect_uri) throw new Error("Missing 'redirect_uri' parameter");

            // Exchange code for token
            const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri,
                    client_id: LINE_LOGIN_CHANNEL_ID,
                    client_secret: LINE_LOGIN_CHANNEL_SECRET,
                }),
            });

            if (!tokenResponse.ok) {
                const errText = await tokenResponse.text();
                console.error("LINE Token Error:", errText);
                throw new Error(`LINE Token Exchange Failed: ${errText}`);
            }

            const tokenData = await tokenResponse.json();

            // Get Profile
            const profileResponse = await fetch('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const lineProfile = await profileResponse.json();

            // Check existing link
            const { data: lineAccount } = await supabase
                .from('line_accounts')
                .select('user_id')
                .eq('line_user_id', lineProfile.userId)
                .maybeSingle();

            if (lineAccount) {
                // Login existing
                const { data: user } = await supabase.auth.admin.getUserById(lineAccount.user_id);
                if (!user?.user?.email) throw new Error("User email not found");

                const { data: link } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: user.user.email,
                });

                // Update profile
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

        // 4. LIFF Login
        if (action === 'liff_login') {
            const { data: lineAccount } = await supabase
                .from('line_accounts')
                .select('user_id')
                .eq('line_user_id', line_user_id)
                .maybeSingle();

            if (lineAccount) {
                const { data: user } = await supabase.auth.admin.getUserById(lineAccount.user_id);
                const { data: link } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: user.user?.email!,
                });

                await supabase.from('line_accounts').update({
                    display_name,
                    picture_url,
                    updated_at: new Date().toISOString()
                }).eq('line_user_id', line_user_id);

                return new Response(JSON.stringify({
                    token_hash: link.properties?.hashed_token,
                    status: 'existing_user'
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({ status: 'new_user' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 5. Auto Restore
        if (action === 'auto_restore') {
            const { data: lineAccount } = await supabase
                .from('line_accounts')
                .select('user_id')
                .eq('line_user_id', line_user_id)
                .maybeSingle();

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

        // 6. Register (New User)
        if (action === 'register') {
            const { email, line_user_id, display_name, picture_url, nickname } = profile_data;
            const randomPassword = crypto.randomUUID();

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: randomPassword,
                email_confirm: true,
                user_metadata: { nickname, avatar_url: picture_url }
            });

            if (authError) throw authError;

            await supabase.from('line_accounts').insert({
                user_id: authData.user.id,
                line_user_id,
                display_name,
                picture_url,
                is_notification_enabled: true
            });

            const { data: link } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email
            });

            return new Response(JSON.stringify({
                token_hash: link.properties?.hashed_token,
                status: 'registered'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (error: any) {
        console.error(error);
        const errorMessage = error?.message || 'Unknown error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
