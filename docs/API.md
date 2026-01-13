# API Reference

Base URL: `https://backend.iamkingori.workers.dev`

## Endpoints

### GET /sync

Fetch all projects and tasks.

**Response**
```json
{
  "projects": [
    {
      "id": "string",
      "name": "string",
      "globalPrompt": "string",
      "knowledgeContext": "string"
    }
  ],
  "tasks": [
    {
      "id": "string",
      "projectId": "string",
      "title": "string",
      "status": "backlog|researching|drafting|review|published",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

---

### POST /sync

Bulk upsert projects.

**Request**
```json
{
  "projects": [
    {
      "id": "string",
      "name": "string",
      "globalPrompt": "string",
      "knowledgeContext": "string",
      "scheduleInterval": "string"
    }
  ]
}
```

**Response**
```json
{ "status": "ok" }
```

---

### POST /task

Create or update a single task.

**Request**
```json
{
  "id": "string",
  "projectId": "string",
  "title": "string",
  "status": "backlog",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Response**
```json
{ "status": "ok" }
```

---

## WebSocket

Connect: `wss://backend.iamkingori.workers.dev/ws`

### Events

**task_updated** (server → client)
```json
{
  "type": "task_updated",
  "task": { ... }
}
```

---

## Error Responses

| Status | Body |
|--------|------|
| 404 | `Not Found` |
| 500 | `Internal Server Error` |

## Types

```typescript
type ContentStatus = 'backlog' | 'researching' | 'drafting' | 'review' | 'published';

interface CMSProject {
  id: string;
  name: string;
  globalPrompt: string;
  knowledgeContext: string;
  scheduleInterval: string;
}

interface CMSTask {
  id: string;
  projectId: string;
  title: string;
  status: ContentStatus;
  researchData?: string;
  contentDraft?: string;
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```
