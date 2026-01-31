// Vercel serverless function to get VocalBridge token
// Endpoint: POST /api/voice-token

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { participant_name } = req.body || {}

  // Validate VocalBridge API key
  const apiKey = process.env.VOCALBRIDGE_API_KEY
  if (!apiKey) {
    console.error('VOCALBRIDGE_API_KEY environment variable not set')
    return res.status(500).json({
      error: 'Server configuration error. Please contact support.'
    })
  }

  try {
    console.log('Requesting VocalBridge token for:', participant_name || 'User')

    const response = await fetch('https://vocalbridgeai.com/api/v1/token', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participant_name: participant_name || 'PresentBuddy User'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('VocalBridge API error:', response.status, errorText)
      throw new Error(`VocalBridge API returned ${response.status}`)
    }

    const data = await response.json()

    console.log('Successfully obtained VocalBridge token')

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error getting VocalBridge token:', error)
    return res.status(500).json({
      error: 'Failed to get voice token',
      details: error.message
    })
  }
}
