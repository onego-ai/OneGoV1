
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio } = await req.json()

    if (!audio) {
      throw new Error('Audio data is required')
    }

    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY')
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key not configured')
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0))

    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: binaryAudio,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Deepgram API error: ${error}`)
    }

    const result = await response.json()
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

    return new Response(
      JSON.stringify({ text: transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in deepgram-stt:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
