# MCP Server Deployment Guide

## Overview

HTTP-based MCP server deployed on **Railway** using Docker. Provides synchronous content generation tools for VocalBridge agents. Moved from Vercel because Manim requires system libraries (cairo, pango, ffmpeg) that serverless functions cannot provide.

## Architecture

```
VocalBridge Planning Agent
    ↓ (Streamable HTTP - MCP 2025-11-25)
MCP Server (Railway /api/mcp - Express + Node.js)
    ↓ (spawn Python CLI - stdin/stdout)
Python Workers
    ├── Content Worker (matplotlib graphs)
    └── Manim Generator (animated videos)
    ↓
Supabase Storage (PNG images, MP4 videos)
```

## Key Technologies

- **@modelcontextprotocol/sdk** v1.25.2 - MCP protocol
- **Express** - HTTP server
- **Zod** v4.3.6 - Schema validation
- **Python 3.11** - matplotlib + Manim generation
- **Docker** - Multi-stage build for system dependencies

## Tools Available

### 1. generate_graph ⏱️ 2-5 seconds (synchronous)
Generates bar, line, or pie chart using Python matplotlib.

**Input:**
- `presentation_id` (string) - UUID of presentation
- `graph_type` (enum) - 'bar', 'line', or 'pie'
- `data` (object) - `{ labels: string[], values: number[] }`
- `title` (string, optional) - Graph title
- `description` (string) - What the graph shows (max 8 words)

**Output:**
```
Graph generated successfully!

URL: https://gcebekzpnpeunkofchtb.supabase.co/storage/v1/object/public/content-assets/graphs/{hash}.png
Job ID: {uuid}
Asset ID: {uuid}
```

### 2. generate_manim_animation ⏱️ 30-50 seconds (synchronous)
Generates animated videos using Manim (3Blue1Brown library).

**Input:**
- `presentation_id` (string) - UUID of presentation
- `description` (string) - What to animate
- `duration_seconds` (number) - Target duration

**Output:**
```
Animation generated successfully!

URL: https://gcebekzpnpeunkofchtb.supabase.co/storage/v1/object/public/content-assets/animations/{hash}.mp4
Job ID: {uuid}
Asset ID: {uuid}
```

### 3. check_generation_status ⚡ <200ms
Query all jobs for a presentation.

**Input:**
- `presentation_id` (string) - UUID

**Output:** JSON array of job objects

### 4. save_presentation_plan ⚡ <500ms
Save complete presentation structure to database.

**Input:**
- `presentation_id` (string) - UUID
- `plan` (object) - Presentation structure with sections
- `handoff_cues` (object) - Triggers for agent handoffs

## Deployment Steps

### 1. Prerequisites
- Railway account
- GitHub repo connected
- Supabase project

### 2. Set Railway Environment Variables
Project Settings → Variables:
- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_KEY=eyJhbGc...` (service_role key)
- `ANTHROPIC_API_KEY=sk-ant-api03-...` (for Manim code generation)

Railway auto-sets:
- `PORT`
- `RAILWAY_PUBLIC_DOMAIN`

### 3. Deploy
Railway auto-deploys from GitHub on push to `main`:
```bash
git push origin main
```

Or manual via CLI:
```bash
railway up
```

Production URL: `https://buddy-api-prod.up.railway.app`

### 4. Configure Claude Code
```bash
claude mcp add-json buddy-api '{"type":"http","url":"https://buddy-api-prod.up.railway.app/api/mcp"}' --scope user
```

### 5. Configure VocalBridge (Production)
Agent Settings:
- **MCP URL**: `https://buddy-api-prod.up.railway.app/api/mcp`
- **Protocol**: Streamable HTTP (2025-11-25)
- Tools auto-discovered via `tools/list`

## Local Development

### 1. Install Dependencies

```bash
npm install
pip install -r api/content-worker/requirements.txt
pip install -r api/manim-generator/requirements.txt
```

### 2. Create .env file

```bash
cp .env.example .env
# Edit .env with your Supabase and Anthropic credentials
```

### 3. Run locally

```bash
node server.js
```

MCP server will be available at `http://localhost:3000/api/mcp`

## Testing MCP Endpoints

### Initialize Session

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'
```

### Test tools/list (with session ID)

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Test generate_graph

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "generate_graph",
      "arguments": {
        "presentation_id": "test-uuid",
        "graph_type": "bar",
        "data": {
          "labels": ["A", "B", "C"],
          "values": [10, 20, 30]
        },
        "title": "Test Graph",
        "description": "Sample data comparison chart"
      }
    }
  }'
```

## File Structure

```
buddy-api/
├── server.js             - Express server (main entry)
├── Dockerfile            - Multi-stage: Python 3.11 + Node 20 + Manim deps
├── railway.json          - Railway configuration
├── package.json          - Node dependencies
└── api/
    ├── mcp/
    │   └── server.js     - MCP server with Streamable HTTP transport
    ├── content-worker/
    │   ├── worker.py     - Python CLI graph generator (stdin/stdout)
    │   └── requirements.txt
    └── manim-generator/
        ├── worker.py     - Python CLI Manim generator (stdin/stdout)
        └── requirements.txt
```

## Troubleshooting

### "No such tool available: mcp__buddy_api__*"
**Cause:** MCP server not loaded by Claude Code
**Fix:** Restart Claude Code after adding MCP config, use `/mcp` to reconnect

### Graph generation fails
**Cause:** Supabase bucket not configured
**Fix:**
```sql
UPDATE storage.buckets SET public = true WHERE name = 'content-assets';
```

### Manim generation fails
**Cause:** Missing system dependencies or API key
**Fix:** Check Railway logs, verify ANTHROPIC_API_KEY is set

### MCP connection timeout
**Cause:** Railway domain not in allowedHosts
**Fix:** Update `api/mcp/server.js` allowedHosts array

## Testing Checklist

- [x] MCP server responds to `initialize`
- [x] MCP server responds to `tools/list`
- [x] `generate_graph` creates job in Supabase
- [x] Python worker generates matplotlib PNG
- [x] Image uploads to Supabase Storage public bucket
- [x] MCP returns graph URL after completion
- [x] `generate_manim_animation` generates video
- [x] `check_generation_status` queries jobs correctly
- [x] `save_presentation_plan` saves to database
- [x] Claude Code can call all 4 tools via HTTP

## Production URL

**Live MCP Server:** https://buddy-api-prod.up.railway.app/api/mcp

## Next Steps

1. ✅ Deploy MCP server to Railway
2. ✅ Implement Streamable HTTP transport
3. ✅ Add Manim animation generation
4. ✅ Test with Claude Code
5. ⏳ Configure VocalBridge Planning Agent
6. ⏳ Test end-to-end with voice agent

---

*Document Version: 3.0*
*Last Updated: 2026-02-02*
*Status: ✅ Working - Railway deployment with Streamable HTTP*
