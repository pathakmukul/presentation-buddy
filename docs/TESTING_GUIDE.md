# MCP Server Testing Guide

## Pre-deployment Checklist

✅ Supabase database tables created
✅ Storage buckets created
✅ Environment variables configured
✅ Dependencies installed
✅ MCP server code ready
✅ Python worker code ready

## Local Testing

### 1. Start Vercel Dev Server

```bash
vercel dev
```

This will start:
- MCP server at `http://localhost:3000/api/mcp`
- Content worker at `http://localhost:3000/api/content-worker`

### 2. Test MCP Tools List

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Expected response: List of 3 tools (generate_graph, check_generation_status, search_web)

### 3. Test Graph Generation

First, create a test presentation in Supabase or use existing UUID.

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
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
        "title": "Weekly Activity"
      }
    }
  }'
```

Should return success with URL to generated graph.

### 4. Test Status Check

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
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

### 5. Test Web Search

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "search_web",
      "arguments": {
        "query": "climate change statistics 2024"
      }
    }
  }'
```

## Deploy to Vercel

### 1. Deploy

```bash
vercel
```

Follow prompts:
- Link to existing project or create new
- Choose project name
- Deploy

### 2. Set Environment Variables in Vercel Dashboard

Go to Project Settings → Environment Variables:

- `SUPABASE_URL`: `https://gcebekzpnpeunkofchtb.supabase.co`
- `SUPABASE_SERVICE_KEY`: (your service role key)

### 3. Redeploy

```bash
vercel --prod
```

### 4. Get Production URL

Your MCP server will be at:
```
https://your-project.vercel.app/api/mcp
```

## Configure VocalBridge

1. Go to VocalBridge dashboard
2. Create new agent (or edit existing Planning Agent)
3. Under MCP Configuration:
   - **MCP Server URL**: `https://your-project.vercel.app/api/mcp`
   - **Protocol**: JSON-RPC 2.0
4. Save and test

Agent will auto-discover all 3 tools.

## Troubleshooting

### Local dev server won't start
- Check Node version: `node -v` (should be 18+)
- Delete `node_modules` and `package-lock.json`, run `npm install` again

### Python function errors
- Ensure Python 3.9 is available: `python3 --version`
- Check `requirements.txt` is in correct location

### Supabase connection errors
- Verify `.env` has correct URL and service key
- Test connection: check if tables exist in Supabase dashboard

### Graph generation fails
- Check `content-assets` bucket exists
- Verify bucket has public access enabled
- Check service role key has storage permissions

## Next Steps After Successful Test

1. ✅ Test all 3 MCP tools locally
2. ✅ Deploy to Vercel
3. ✅ Configure VocalBridge agent
4. Test end-to-end: Agent → MCP → Graph generation → Storage
5. Build React frontend to display generated content
