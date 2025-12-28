
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code, redirectUri } = await req.json()

        // 1. Check Env Vars
        const clientId = Deno.env.get('LINE_CHANNEL_ID')
        const clientSecret = Deno.env.get('LINE_CHANNEL_SECRET')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

        if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Missing environment variables')
        }

        // 2. Exchange code for tokens
        const params = new URLSearchParams()
        params.append('grant_type', 'authorization_code')
        params.append('code', code)
        params.append('redirect_uri', redirectUri)
        params.append('client_id', clientId)
        params.append('client_secret', clientSecret)

        const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        })

        const tokenData = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error('LINE Token Error:', tokenData)
            throw new Error(tokenData.error_description || 'Failed to get tokens from LINE')
        }

        // 3. Get User Profile from ID Token requires verification/decoding
        // But simplest is to use Access Token to get Profile
        const profileRes = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })
        const profileData = await profileRes.json()

        if (!profileRes.ok) {
            throw new Error('Failed to get user profile from LINE')
        }

        const lineUserId = profileData.userId
        const displayName = profileData.displayName
        const pictureUrl = profileData.pictureUrl
        // create a fake email for mapping
        const email = `${lineUserId}@line.login.placeholder`

        // 4. Admin Auth
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

        // Check if user exists, if not create
        const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers()
        // Simple verification (in production, use stricter query if possible)
        // Supabase listUsers might not scale indefinitely, but good for now or use getUserByEmail if available via wrapper?
        // Actually createClient admin api has createUser which fails if exists? No, it returns error.

        // Let's try to get by email directly? No direct API for getByEmail in early versions? 
        // Actually listUsers is fine for small scale, but better:

        // Try to create user. If fails (email taken), then just proceed.
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                nickname: displayName,
                avatar_url: pictureUrl,
                line_user_id: lineUserId
            }
        })

        let userId = newUser?.user?.id

        if (createError) {
            // Assume user exists loop
            // Find user by email manually (or trust it exists)
            // Note: listUsers is paginated.
            // A better way is:
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
            const found = users.find(u => u.email === email)
            if (found) {
                userId = found.id
                // Update metadata just in case
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        nickname: displayName,
                        avatar_url: pictureUrl,
                        line_user_id: lineUserId
                    }
                })
            } else {
                // If creation failed but user not found? (Checking specific error usually)
                throw new Error('Failed to create or find user: ' + createError.message)
            }
        }

        // 5. Generate Magic Link for instant login
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: redirectUri
            }
        })

        if (linkError) {
            throw new Error('Failed to generate login link: ' + linkError.message)
        }

        return new Response(
            JSON.stringify({
                redirectUrl: linkData.properties.action_link
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
