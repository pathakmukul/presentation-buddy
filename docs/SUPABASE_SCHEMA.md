# Supabase Database Schema

## Tables Overview

### users
User accounts linked to Supabase Auth
- id (UUID)
- email (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

### projects
User projects containing presentations
- id (UUID)
- user_id (UUID)
- name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

### presentations
Individual presentation configurations
- id (UUID)
- project_id (UUID)
- goal (TEXT) - 'ppt' or 'video'
- support_level (TEXT) - 'cohost', 'when_stuck', or 'moderator'
- duration_seconds (INTEGER) - 60 to 600
- status (TEXT) - 'draft', 'ready', 'recording', 'completed'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

### presentation_plans
Detailed presentation structure and handoff cues
- id (UUID)
- presentation_id (UUID)
- structure (JSONB)
- handoff_cues (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

### content_jobs
Async job queue for content generation
- id (UUID)
- presentation_id (UUID)
- content_type (TEXT) - 'image', 'graph', 'manim_animation', 'table'
- specifications (JSONB)
- status (TEXT) - 'queued', 'generating', 'completed', 'failed'
- asset_id (UUID)
- error_message (TEXT)
- retry_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- completed_at (TIMESTAMP)

---

### content_assets
Generated and uploaded content files
- id (UUID)
- presentation_id (UUID)
- type (TEXT) - 'image', 'graph', 'table', 'manim_animation', 'document'
- file_url (TEXT)
- metadata (JSONB)
- status (TEXT) - 'generating', 'ready', 'failed'
- created_at (TIMESTAMP)

---

### presentation_sessions
Recording session data and transcripts
- id (UUID)
- presentation_id (UUID)
- start_time (TIMESTAMP)
- end_time (TIMESTAMP)
- transcript (JSONB)
- cues_triggered (JSONB)
- content_displayed (JSONB)
- recording_url (TEXT)
- created_at (TIMESTAMP)

---

### agent_conversations
Planning Agent chat history
- id (UUID)
- presentation_id (UUID)
- messages (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

## Storage Buckets

### content-assets
Stores generated images, graphs, tables, animations

### recordings
Stores presentation video recordings

### source-documents
Stores user-uploaded source materials

---

## Security

All tables have Row Level Security (RLS) enabled. Users can only access their own data through policy enforcement based on `auth.uid()`.
