
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { title, content, area, communityId } = await req.json()

        if (!LINE_CHANNEL_ACCESS_TOKEN) {
            throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set')
        }

        // Construct the message
        const message = {
            type: 'flex',
            altText: `【回覧板】${title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '回覧板BASE',
                            color: '#06C755',
                            weight: 'bold',
                            size: 'xs'
                        },
                        {
                            type: 'text',
                            text: title,
                            weight: 'bold',
                            size: 'xl',
                            margin: 'md',
                            wrap: true
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: content,
                            wrap: true,
                            size: 'sm',
                            color: '#555555'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'エリア',
                                            color: '#aaaaaa',
                                            size: 'xs',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: area || 'コミュニティ',
                                            wrap: true,
                                            color: '#666666',
                                            size: 'xs',
                                            flex: 5
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            style: 'link',
                            height: 'sm',
                            action: {
                                type: 'uri',
                                label: '詳細を確認する',
                                uri: 'https://kairanban-base.com/app' // Adjust to real URL
                            }
                        }
                    ],
                    flex: 0
                }
            }
        }

        // For simplicity in this demo, we use 'broadcast' to send to everyone.
        // In production, we should use 'multicast' and target specific users based on 'area'.
        const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                messages: [message],
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('LINE API Error:', data);
            throw new Error(`LINE API Error: ${data.message || response.statusText}`);
        }

        return new Response(
            JSON.stringify({ success: true, daa: data }),
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
