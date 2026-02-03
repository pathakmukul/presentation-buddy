# MCP Server Testing Guide

## Pre-deployment Checklist

✅ Supabase database tables created
✅ Storage buckets created
✅ Environment variables configured
✅ Dependencies installed
✅ MCP server code ready
✅ Python worker code ready

## Local Testing

### 1. Start Local Server

```bash
cd buddy-api
node server.js
```

This will start:
- MCP server at `http://localhost:3000/api/mcp`
- Content worker at `http://localhost:3000/api/content-worker`
- Manim generator at `http://localhost:3000/api/manim-generator`

### 2. Test MCP Initialize + Tools List

MCP uses Streamable HTTP transport (2025-11-25 protocol). First initialize a session:

```bash
# Initialize session
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

# Note the mcp-session-id from response headers, then:
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id-from-init>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

Expected response: List of 4 tools (generate_graph, generate_manim_animation, check_generation_status, save_presentation_plan)

### 3. Test Graph Generation

First, create a test presentation in Supabase or use existing UUID.

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "generate_graph",
      "arguments": {
        "presentation_id": "your-test-uuid-here",
        "graph_type": "bar",
        "data": {
          "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
          "values": [12, 19, 15, 22, 18]
        },
        "title": "Weekly Activity",
        "description": "Daily activity levels this week"
      }
    }
  }'
```

Should return success with URL to generated graph.

### 4. Test Status Check

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "check_generation_status",
      "arguments": {
        "presentation_id": "your-test-uuid-here"
      }
    }
  }'
```

### 5. Test Manim Animation

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "generate_manim_animation",
      "arguments": {
        "presentation_id": "your-test-uuid-here",
        "description": "Show a sine wave animating from left to right",
        "duration_seconds": 5
      }
    }
  }'
```

## Deploy to Railway

### 1. Deploy

Railway auto-deploys from GitHub on push to `main`:

```bash
cd buddy-api
git add .
git commit -m "Update MCP server"
git push origin main
```

Or manual deploy via Railway CLI:
```bash
railway up
```

### 2. Set Environment Variables in Railway Dashboard

Go to Project Settings → Variables:

- `SUPABASE_URL`: `https://gcebekzpnpeunkofchtb.supabase.co`
- `SUPABASE_SERVICE_KEY`: (your service role key)
- `ANTHROPIC_API_KEY`: (your Anthropic API key for Manim generation)

Railway auto-sets:
- `PORT`
- `RAILWAY_PUBLIC_DOMAIN`

### 3. Get Production URL

Your MCP server will be at:
```
https://buddy-api-prod.up.railway.app/api/mcp
```

## Configure VocalBridge

1. Go to VocalBridge dashboard
2. Create new agent (or edit existing Planning Agent)
3. Under MCP Configuration:
   - **MCP Server URL**: `https://buddy-api-prod.up.railway.app/api/mcp`
   - **Protocol**: Streamable HTTP (2025-11-25)
4. Save and test

Agent will auto-discover all 4 tools.

## Configure Claude Code

```bash
# Add MCP server
claude mcp add-json buddy-api '{"type":"http","url":"https://buddy-api-prod.up.railway.app/api/mcp"}' --scope user

# List servers
claude mcp list

# Reconnect in chat
/mcp
```

## Troubleshooting

### Local dev server won't start
- Check Node version: `node -v` (should be 18+)
- Delete `node_modules` and `package-lock.json`, run `npm install` again

### Python function errors
- Ensure Python 3.11+ is available: `python3 --version`
- Check `requirements.txt` is in correct location
- Install deps: `pip install -r api/content-worker/requirements.txt`

### Supabase connection errors
- Verify `.env` has correct URL and service key
- Test connection: check if tables exist in Supabase dashboard

### Graph generation fails
- Check `content-assets` bucket exists
- Verify bucket has public access enabled
- Check service role key has storage permissions

### Manim generation fails
- Verify ANTHROPIC_API_KEY is set
- Check system dependencies (cairo, pango, ffmpeg) - handled by Docker on Railway
- Check Railway logs for Python errors

## Next Steps After Successful Test

1. ✅ Test all 4 MCP tools locally
2. ✅ Deploy to Railway
3. ✅ Configure VocalBridge agent
4. Test end-to-end: Agent → MCP → Content generation → Storage
5. Build React frontend to display generated content
