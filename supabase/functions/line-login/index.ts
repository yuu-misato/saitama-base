import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID') || Deno.env.get('LINE_LOGIN_CHANNEL_ID');
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') || Deno.env.get('LINE_LOGIN_CHANNEL_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, code, redirect_uri, profile_data, liff_access_token, line_user_id, display_name, picture_url } = await req.json();

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Generate Auth URL
        if (action === 'get_auth_url') {
            const authState = crypto.randomUUID();
            const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('client_id', LINE_LOGIN_CHANNEL_ID!);
            authUrl.searchParams.set('redirect_uri', redirect_uri);
            authUrl.searchParams.set('state', authState);
            authUrl.searchParams.set('scope', 'profile openid email');

            return new Response(
                JSON.stringify({ auth_url: authUrl.toString(), state: authState }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Callback Processing
        if (action === 'callback') {
            // Exchange code for token
            const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri,
                    client_id: LINE_LOGIN_CHANNEL_ID!,
                    client_secret: LINE_LOGIN_CHANNEL_SECRET!,
                }),
            });

            if (!tokenResponse.ok) throw new Error(await tokenResponse.text());
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
                const { data: link } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: user.user?.email!,
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

        // 3. LIFF Login
        if (action === 'liff_login') {
            // Check existing link
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

        // 4. Auto Restore
        if (action === 'auto_restore') {
            const { data: lineAccount } = await supabase
                .from('line_accounts')
                .select('user_id')
                .eq('line_user_id', line_user_id)
                .maybeSingle();

            if (!lineAccount) return new Response(JSON.stringify({ error: 'restore_failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

        // 5. Register (New User)
        if (action === 'register') {
            const { email, line_user_id, display_name, picture_url, nickname, area } = profile_data;
            const randomPassword = crypto.randomUUID();

            // Create Auth User
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: randomPassword,
                email_confirm: true,
                user_metadata: { nickname, avatar_url: picture_url }
            });

            if (authError) throw authError;

            // Create Profile (assume profiles table exists)
            /* 
              Usually profile creation is handled by trigger. 
              But here we ensure line_accounts link.
            */

            // Link LINE account
            await supabase.from('line_accounts').insert({
                user_id: authData.user.id,
                line_user_id,
                display_name,
                picture_url,
                is_notification_enabled: true
            });

            // Generate Login Link
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

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
