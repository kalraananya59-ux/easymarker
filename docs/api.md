# Easymarker Public API (v1)

Phase 1 scope, per PRD §8.14. For power users and early integration partners.

## Authentication

Generate an API key from **Dashboard → Settings → Generate new API key**. Generating a new key immediately invalidates any previous key for that workspace — only one key is active at a time.

Send it as a bearer token on every request:

```
Authorization: Bearer <your-api-key>
```

Unauthenticated or invalid-key requests return `401`.

## Rate limiting

60 requests per minute per API key. Exceeding it returns `429`.

## Errors

All errors are returned as JSON in a consistent shape:

```json
{ "error": { "code": "SOME_CODE", "message": "Human-readable explanation." } }
```

## Endpoints

### `POST /api/v1/projects`

Create a URL project.

**Body:**

```json
{ "url": "https://example.com" }
```

**Response `201`:**

```json
{
  "project": { "id": "...", "type": "url", "url": "https://example.com/", "shareToken": "...", "...": "..." },
  "shareUrl": "/r/<token>"
}
```

Validation errors (invalid URL, private/local address, unreachable target) return `400`.

### `GET /api/v1/projects`

List all projects in your workspace, most recently created first.

**Response `200`:**

```json
{ "projects": [ { "id": "...", "type": "url", "...": "..." } ] }
```

### `GET /api/v1/projects/:id/comments`

List all comments on a project you own, oldest first.

**Response `200`:**

```json
{ "comments": [ { "id": "...", "reviewerName": "...", "body": "...", "status": "open", "...": "..." } ] }
```

Returns `404` if the project doesn't exist or isn't owned by your workspace.

## Not in Phase 1

Per PRD §8.14 and §9: no webhooks, no OAuth, no SDK libraries. Revoke a leaked key by generating a new one — the old one stops working immediately.
