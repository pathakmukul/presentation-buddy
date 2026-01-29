# MCP Server Deployment Guide

## Overview

HTTP-based MCP server deployed on Vercel using `mcp-handler` package. Provides synchronous content generation tools for VocalBridge agents.

## Architecture

```
VocalBridge Planning Agent
    ↓ (HTTP MCP protocol)
MCP Server (Vercel /api/mcp - TypeScript)
    ↓ (await fetch - synchronous)
Python Worker (Vercel /api/content-worker)
    ↓ (matplotlib + Supabase SDK)
Supabase Storage (PNG images)
```

## Key Technologies

- **mcp-handler** v1.0.7 - Vercel's official MCP HTTP handler
- **@modelcontextprotocol/sdk** v1.25.2 - MCP protocol
- **Zod** v4.3.6 - Schema validation
- **Python 3.9** - matplotlib graph generation
- **supabase-py** v2.10.0 - Storage uploads

## Tools Available

### 1. generate_graph ⏱️ 5-10 seconds (synchronous)
Generates bar, line, or pie chart using Python matplotlib.

**Input:**
- `presentation_id` (string) - UUID of presentation
- `graph_type` (enum) - 'bar', 'line', or 'pie'
- `data` (object) - `{ labels: string[], values: number[] }`
- `title` (string, optional) - Graph title

**Output:**
```
Graph generated successfully!

URL: https://gcebekzpnpeunkofchtb.supabase.co/storage/v1/object/public/content-assets/graphs/{hash}.png
Job ID: {uuid}
Asset ID: {uuid}
```

**Behavior:** **Blocks 5-10 seconds** until Python worker completes

### 2. check_generation_status ⚡ <200ms
Query all jobs for a presentation.

**Input:**
- `presentation_id` (string) - UUID

**Output:** JSON array of job objects:
```json
[
  {
    "id": "uuid",
    "status": "completed",
    "asset_id": "uuid",
    "created_at": "timestamp",
    "completed_at": "timestamp"
  }
]
```

### 3. search_web ⚡ 1-2 seconds
DuckDuckGo instant answer API.

**Input:**
- `query` (string)

**Output:** JSON with search results

## ✅ What Worked

### Synchronous Execution Pattern
```typescript
// MCP tool awaits Python worker completion
const response = await fetch(workerUrl, { method: 'POST', body: JSON.stringify({...}) });
const result = await response.json();
return { content: [{ type: 'text', text: `Graph URL: ${result.url}` }] };
```

### HTTP MCP via mcp-handler
```typescript
import { createMcpHandler } from 'mcp-handler';

const handler = createMcpHandler(
  (server) => {
    server.tool('generate_graph', 'description', schema, async (args) => {...});
  },
  {},
  { basePath: '/api' }
);

export { handler as GET, handler as POST, handler as DELETE };
```

### Exact Package Versions (Critical!)
```json
{
  "@modelcontextprotocol/sdk": "1.25.2",  // NOT ^1.25.3
  "mcp-handler": "^1.0.7",
  "supabase": "2.10.0"  // Python - NOT 2.12.1
}
```

## ❌ What Failed

### Fire-and-Forget Async
```typescript
// ❌ DOESN'T WORK - Vercel kills pending requests
fetch(workerUrl, {...});  // no await
return { job_id };  // returns immediately
// Worker NEVER executes - function terminated
```

### stdio Transport
```typescript
// ❌ DOESN'T WORK - Only works locally
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Can't expose over HTTP for VocalBridge
```

## Deployment Steps

### 1. Install Dependencies
```bash
npm install @modelcontextprotocol/sdk@1.25.2 mcp-handler@^1.0.7 zod@^4.3.6
```

### 2. Set Vercel Environment Variables
Project Settings → Environment Variables:
- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_KEY=eyJhbGc...` (service_role key)

### 3. Deploy
```bash
vercel --prod
```

Production URL: `https://buddy-api-rouge.vercel.app`

### 4. Configure Claude Code (Local Testing)
```bash
claude mcp add-json buddy-api '{"type":"http","url":"https://buddy-api-rouge.vercel.app/api/mcp"}'
```

### 5. Configure VocalBridge (Production)
Agent Settings:
- **MCP URL**: `https://buddy-api-rouge.vercel.app/api/mcp`
- **Transport**: HTTP
- Tools auto-discovered via `tools/list`

## Local Development

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Create .env file

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Run locally

```bash
vercel dev
```

MCP server will be available at `http://localhost:3000/api/mcp`

## Testing MCP Endpoints

### Test tools/list

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Test generate_graph

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
        "presentation_id": "test-uuid",
        "graph_type": "bar",
        "data": {
          "labels": ["A", "B", "C"],
          "values": [10, 20, 30]
        },
        "title": "Test Graph"
      }
    }
  }'
```

## File Structure

```
/api
  /mcp
    index.ts         - Main MCP server endpoint
  /content-worker
    index.py         - Python content generation worker
    requirements.txt - Python dependencies
vercel.json         - Vercel configuration
package.json        - Node dependencies
```

## Troubleshooting

### "No such tool available: mcp__buddy_api__*"
**Cause:** MCP server not loaded by Claude Code
**Fix:** Restart Claude Code after adding MCP config, verify tool name prefix matches server name

### Jobs stuck at "generating" forever
**Cause:** Fire-and-forget async pattern - Vercel kills pending operations
**Fix:** Use synchronous `await fetch()` pattern (see "What Worked" section)

### TypeError: Client.__init__() got unexpected keyword 'proxy'
**Cause:** supabase-py v2.12.1 incompatible
**Fix:** Downgrade to `supabase==2.10.0` in requirements.txt

### Bucket not found / 404 on image URLs
**Cause:** Supabase bucket is private
**Fix:**
```sql
UPDATE storage.buckets SET public = true WHERE name = 'content-assets';
```

### MCP SDK version mismatch
**Cause:** `mcp-handler@1.0.7` requires exactly SDK v1.25.2
**Fix:** Use `"@modelcontextprotocol/sdk": "1.25.2"` (no caret)

### Foreign key constraint violation
**Cause:** Test presentation_id doesn't exist
**Fix:** Create valid presentation first:
```sql
INSERT INTO presentations (id, goal, support_level, duration_seconds, status)
VALUES (gen_random_uuid(), 'ppt', 'cohost', 300, 'draft') RETURNING id;
```

### matplotlib cache directory error
**Cause:** Vercel can't write to default matplotlib cache
**Fix:** Add to Python worker:
```python
import os
os.environ['MPLCONFIGDIR'] = '/tmp/matplotlib'
```

## Testing Checklist

- [x] MCP server responds to `tools/list`
- [x] `generate_graph` creates job in Supabase
- [x] Python worker generates matplotlib PNG
- [x] Image uploads to Supabase Storage public bucket
- [x] MCP returns graph URL after completion
- [x] `check_generation_status` queries jobs correctly
- [x] `search_web` returns DuckDuckGo results
- [x] Claude Code can call all 3 tools via HTTP

## Production URL

**Live MCP Server:** https://buddy-api-rouge.vercel.app/api/mcp

## Next Steps

1. ✅ Deploy MCP server to Vercel
2. ✅ Test with Claude Code locally
3. ⏳ Configure VocalBridge Planning Agent
4. ⏳ Test end-to-end with voice agent
5. 🔮 Future: Manim animations, DALL-E images

---

*Document Version: 2.0*
*Last Updated: 2026-01-29*
*Status: ✅ Working - Synchronous execution pattern*
