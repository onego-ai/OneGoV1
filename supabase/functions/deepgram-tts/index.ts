
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const { text, voice } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY')
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key not configured')
    }

    // Use new Aura 2 voice models
    // Electra: Professional female voice for Nia (corporate)
    // Odysseus: Engaging male voice for Leo (educational)  
    const voiceModel = voice === 'female' ? 'aura-2-electra-en' : 'aura-2-odysseus-en'

    console.log(`Using Deepgram TTS with model: ${voiceModel}`)

    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${voiceModel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Deepgram TTS error: ${error}`)
      throw new Error(`Deepgram TTS failed: ${response.status}`)
    }

    // Get audio buffer and convert to base64
    const audioBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(audioBuffer)
    
    // Convert to base64 safely
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    const base64Audio = btoa(binary)

    console.log('Deepgram TTS successful, audio generated')

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in deepgram-tts:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
