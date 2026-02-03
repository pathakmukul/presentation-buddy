// Vercel serverless function to upload content (TXT files and images)
// Endpoint: POST /api/upload-content

import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'

// Disable default body parser to handle multipart ourselves
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper to get Supabase admin client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Parse multipart form data
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true
    })

    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Create Supabase client for this request
    const supabase = getSupabaseClient()

    // Debug: Check env vars
    console.log('🔍 Supabase client created successfully')

    // Parse multipart form
    const { fields, files } = await parseForm(req)

    const file = files.file?.[0] || files.file
    const presentation_id = fields.presentation_id?.[0] || fields.presentation_id
    const description = fields.description?.[0] || fields.description

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    if (!presentation_id) {
      return res.status(400).json({ success: false, error: 'presentation_id is required' })
    }

    // Determine file type
    const filename = file.originalFilename || file.newFilename
    const ext = filename.split('.').pop().toLowerCase()

    let assetType, bucketName, extractedText = null

    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    const docExts = ['txt']

    if (imageExts.includes(ext)) {
      assetType = 'image'
      bucketName = 'content-assets'
    } else if (docExts.includes(ext)) {
      assetType = 'document'
      bucketName = 'source-documents'
      // Extract text from TXT file
      const fileBuffer = await readFile(file.filepath)
      extractedText = fileBuffer.toString('utf-8')
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type. Allowed: ${[...imageExts, ...docExts].join(', ')}`
      })
    }

    // Generate unique filename
    const uuid = randomUUID()
    const storagePath = `${presentation_id}/${uuid}-${filename}`

    // Read file buffer for upload
    const fileBuffer = await readFile(file.filepath)

    // Upload to Supabase storage
    console.log('Uploading to bucket:', bucketName, 'Path:', storagePath)
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      console.error('Upload details:', {
        bucket: bucketName,
        path: storagePath,
        size: fileBuffer.length,
        type: file.mimetype
      })
      return res.status(500).json({
        success: false,
        error: `Upload failed: ${uploadError.message}`,
        details: uploadError
      })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath)

    const fileUrl = urlData.publicUrl

    // Build metadata
    const metadata = {
      filename,
      source: 'user_upload'
    }

    if (assetType === 'image') {
      metadata.description = description || filename
      metadata.source = 'user_upload'
    } else if (assetType === 'document') {
      metadata.extracted_text = extractedText
      metadata.file_type = ext
      metadata.source = 'user_upload'
    }

    // Insert into content_assets table
    const { data: asset, error: dbError } = await supabase
      .from('content_assets')
      .insert({
        presentation_id,
        type: assetType,
        file_url: fileUrl,
        status: 'ready',
        metadata
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Cleanup uploaded file
      await supabase.storage.from(bucketName).remove([storagePath])
      return res.status(500).json({ success: false, error: `Database error: ${dbError.message}` })
    }

    return res.status(200).json({
      success: true,
      asset: {
        id: asset.id,
        type: assetType,
        filename,
        url: fileUrl,
        description: metadata.description || metadata.extracted_text?.substring(0, 100)
      }
    })

  } catch (error) {
    console.error('Upload content error:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
