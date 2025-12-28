
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
        const reqData = await req.json()
        const { action } = reqData

        // Environment Variables
        const channelId = Deno.env.get('LINE_CHANNEL_ID')
        const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

        if (!channelId || !channelSecret || !supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing environment variables')
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

        // Helper: Find User by LINE ID (via Metadata)
        // Note: listUsers() is not efficient for large datasets. 
        // Ideally, use a dedicated table or query by email if predictable.
        const findUserByLineId = async (lineUserId: string) => {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
            if (error) throw error
            // Search in metadata
            return users.find(u => u.user_metadata?.line_user_id === lineUserId)
        }

        // Helper: Get or Create User and Generate Session
        const getOrCreateUserSession = async (lineProfile: any) => {
            const { userId: lineUserId, displayName, pictureUrl } = lineProfile
            // Email placeholder
            const email = `${lineUserId}@line.login.placeholder`

            let userId: string | undefined
            const existingUser = await findUserByLineId(lineUserId)

            if (existingUser) {
                userId = existingUser.id
                // Update metadata
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        line_user_id: lineUserId,
                        nickname: displayName,
                        avatar_url: pictureUrl,
                        line_display_name: displayName,
                        line_picture_url: pictureUrl
                    }
                })
            } else {
                // Check if email already exists (edge case)
                // If we use placeholder email, this only happens if we reuse the logic
                // Try create
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: email,
                    email_confirm: true,
                    user_metadata: {
                        line_user_id: lineUserId,
                        nickname: displayName,
                        avatar_url: pictureUrl,
                        line_display_name: displayName,
                        line_picture_url: pictureUrl
                    }
                })

                if (createError) {
                    // Try to find by email if create failed (e.g. email already registered)
                    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
                    const foundByEmail = users.find(u => u.email === email)
                    if (foundByEmail) {
                        userId = foundByEmail.id
                    } else {
                        throw new Error(`Failed to create user: ${createError.message}`)
                    }
                } else {
                    userId = newUser.user?.id
                }
            }

            if (!userId) throw new Error('User ID resolution failed')

            // Generate Magic Link Token
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
            })

            if (linkError) throw linkError

            return {
                token_hash: linkData.properties.hashed_token,
                user_id: userId,
                line_user_id: lineUserId
            }
        }

        // --- ACTION HANDLERS ---

        // 1. LIFF Login (Auto Login inside LINE App)
        if (action === 'liff_login') {
            const { liff_access_token } = reqData
            if (!liff_access_token) throw new Error('Missing liff_access_token')

            // Verify Token & Get Profile directly from LINE
            const profileRes = await fetch('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${liff_access_token}` }
            })

            if (!profileRes.ok) throw new Error('Invalid LIFF access token')
            const profile = await profileRes.json()

            const sessionData = await getOrCreateUserSession(profile)

            return new Response(JSON.stringify(sessionData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Web Login (Callback from OAuth)
        // Support legacy 'code' at root for compatibility if needed, but we prefer 'action'
        const code = reqData.code || (action === 'callback' ? reqData.code : null);

        if (code) {
            const { redirectUri } = reqData
            if (!redirectUri) throw new Error('Missing redirectUri')

            // Exchange Code
            const params = new URLSearchParams()
            params.append('grant_type', 'authorization_code')
            params.append('code', code)
            params.append('redirect_uri', redirectUri)
            params.append('client_id', channelId)
            params.append('client_secret', channelSecret)

            const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })
            const tokenData = await tokenRes.json()
            if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Token exchange failed')

            // Get Profile
            const profileRes = await fetch('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            })
            if (!profileRes.ok) throw new Error('Profile fetch failed')
            const profile = await profileRes.json()

            const sessionData = await getOrCreateUserSession(profile)

            return new Response(JSON.stringify(sessionData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 3. Get Auth URL (for Web Login button)
        if (action === 'get_auth_url') {
            const { redirectUri } = reqData
            const state = crypto.randomUUID()
            const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
            url.searchParams.set('response_type', 'code')
            url.searchParams.set('client_id', channelId)
            url.searchParams.set('redirect_uri', redirectUri)
            url.searchParams.set('state', state)
            url.searchParams.set('scope', 'profile openid')

            return new Response(JSON.stringify({ auth_url: url.toString(), state }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        throw new Error(`Unknown action: ${action}`)

    } catch (error) {
        console.error('LINE Login Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
