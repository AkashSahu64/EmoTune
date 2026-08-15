# Emotune API Documentation

## Base URL

- **Development:** `http://localhost:5000/api`
- **Production:** `https://your-domain.com/api`

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 7 days (configurable via `JWT_EXPIRY`). Use the refresh token endpoint to obtain new access tokens.

---

## Auth Endpoints

### POST /auth/signup

Create a new user account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "_id": "64a1...",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "",
    "status": "offline"
  }
}
```

**Errors:** 400 (validation), 409 (duplicate email/username)

### POST /auth/login

Authenticate with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { ... }
}
```

### POST /auth/logout

Invalidate the current refresh token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "message": "Logged out successfully" }
```

### POST /auth/refresh-token

Get a new access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

### GET /auth/me

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "_id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "",
    "status": "online",
    "bio": "",
    "personas": [],
    "settings": { ... },
    "preferences": { ... },
    "lastActive": "2026-07-09T..."
  }
}
```

### PATCH /auth/profile

Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "username": "newusername",
  "avatar": "https://...",
  "bio": "Updated bio"
}
```

**Response (200):**
```json
{
  "user": { ... }
}
```

### POST /auth/seed

Seed a test user (development only).

**Response (200):**
```json
{ "message": "Test user created" }
```

---

## Message Endpoints

### POST /messages

Send a message to a chat.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "chatId": "64a1...",
  "content": "Hello!",
  "type": "text",
  "replyTo": "64a1...",
  "silent": false,
  "personaUsed": ""
}
```

**Response (201):**
```json
{
  "message": {
    "_id": "...",
    "sender": { "_id": "...", "username": "johndoe" },
    "chat": "64a1...",
    "content": "Hello!",
    "type": "text",
    "createdAt": "2026-07-09T..."
  },
  "intelligence": {
    "emotion": { "emotion": "happy", "confidence": 0.8 },
    "intents": ["social"]
  }
}
```

**CURL Example:**
```bash
curl -X POST http://localhost:5000/api/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"64a1...","content":"Hello!","type":"text"}'
```

### GET /messages/:chatId

Get messages for a chat (paginated).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Messages per page |
| before | ISO date | - | Get messages before this date |

**Response (200):**
```json
{
  "messages": [ ... ],
  "page": 1,
  "totalPages": 5,
  "totalMessages": 243
}
```

### DELETE /messages/:messageId

Delete a message for yourself (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "message": "Message deleted" }
```

### DELETE /messages/:messageId/everyone

Delete a message for everyone.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "message": "Message deleted for everyone" }
```

### PATCH /messages/:messageId/edit

Edit a message.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "content": "Edited content" }
```

**Response (200):**
```json
{ "message": { ... } }
```

### POST /messages/forward

Forward a message to another chat.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "messageId": "64a1...",
  "targetChatId": "64a2..."
}
```

**Response (201):**
```json
{ "message": { ... } }
```

### POST /messages/:messageId/pin

Pin a message in the chat.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "message": "Message pinned" }
```

### POST /messages/:messageId/unpin

Unpin a message.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "message": "Message unpinned" }
```

### PATCH /messages/read

Mark messages as read.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "chatId": "64a1...",
  "messageIds": ["64a2..."]
}
```

**Response (200):**
```json
{ "message": "Marked as read" }
```

### GET /messages/silent

Get silent messages for the current user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "messages": [ ... ]
}
```

### POST /messages/accept-silent

Accept a silent message.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "messageId": "64a1..." }
```

**Response (200):**
```json
{ "message": "Silent message accepted" }
```

### GET /messages/:chatId/counts

Get intent counts for a chat.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "counts": {
    "task": 12,
    "social": 45,
    "question": 23,
    "idea": 8,
    "reminder": 3
  }
}
```

---

## Chat Endpoints

### GET /chats

Get all chats for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "chats": [
    {
      "_id": "64a1...",
      "type": "direct",
      "name": "",
      "participants": [...],
      "lastMessage": { "content": "Hey!", "createdAt": "..." },
      "unreadCount": 2
    }
  ]
}
```

### POST /chats/direct/:userId

Get or create a direct chat with another user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "chat": { ... },
  "isNew": false
}
```

**CURL Example:**
```bash
curl -X POST http://localhost:5000/api/chats/direct/64a1... \
  -H "Authorization: Bearer <token>"
```

---

## AI Endpoints

### GET /ai/suggestions/:chatId

Get content suggestions for a chat.

**Headers:** `Authorization: Bearer <token>`

**Rate Limit:** 20 requests per minute

**Response (200):**
```json
{
  "emojis": [{ "emoji": "😊", "score": 0.85, "reason": "..." }],
  "gifs": [{ "query": "happy", "score": 0.72 }],
  "stickers": [{ "id": "happy_1", "type": "happy", "url": "/stickers/happy.webp" }],
  "shayaris": [{ "text": "romantic", "type": "romantic", "id": "shayari_romantic_0" }],
  "songs": [{ "title": "upbeat pop", "artist": "", "query": "upbeat pop" }],
  "videos": [{ "title": "happy", "url": "", "query": "happy" }],
  "suggestions": [{ "text": "Tell me more!", "type": "template", "source": "rule" }],
  "metadata": {
    "topScore": 0.85,
    "avgConfidence": 0.62,
    "signalsUsed": 12,
    "computationTime": 15
  }
}
```

### POST /ai/rewrite

Rewrite a message with a different tone.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "text": "I don't like this",
  "tone": "professional"
}
```

**Response (200):**
```json
{
  "rewritten": "I have some concerns regarding this approach."
}
```

### GET /ai/emotion-theme/:chatId

Get emotion theme for a chat.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "theme": {
    "currentEmotion": "happy",
    "dominantEmotion": "joyful",
    "emotionTimeline": [...]
  }
}
```

### POST /ai/translate

Translate a message.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "text": "Hello, how are you?",
  "targetLang": "hi"
}
```

**Response (200):**
```json
{
  "translated": "नमस्ते, आप कैसे हैं?"
}
```

### GET /ai/emojis/:chatId

Get emoji suggestions.

### GET /ai/gifs/:chatId

Get GIF suggestions.

### GET /ai/shayari/:chatId

Get shayari/poetry suggestions.

### GET /ai/songs/:chatId

Get song suggestions.

### GET /ai/videos/:chatId

Get video suggestions.

### GET /ai/summary/:chatId

Get conversation summary.

### GET /ai/intelligence/:chatId

Get full conversation intelligence.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "analysis": {
    "emotion": { "emotion": "happy", "confidence": 0.8 },
    "emotionTrend": "improving",
    "dominantEmotion": "joyful",
    "conversationState": "discussion",
    "relationship": "friend",
    "topic": "technology",
    "momentum": "moderate",
    "predictions": { ... }
  },
  "recommendations": { ... },
  "predictions": { ... },
  "health": { ... },
  "explanations": { ... }
}
```

### GET /ai/stream/:chatId

Get streaming suggestions via Server-Sent Events (SSE).

### GET /ai/metrics

Get AI provider metrics (admin).

### GET /ai/cache

Get cache status (admin).

---

## Group Endpoints

### POST /groups

Create a group chat.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Friends Group",
  "description": "Group for close friends",
  "participants": ["64a2...", "64a3..."]
}
```

**Response (201):**
```json
{ "group": { ... } }
```

### GET /groups

Get all groups for the user.

### POST /groups/add-member

Add a member to a group.

**Request:**
```json
{
  "groupId": "64a1...",
  "userId": "64a2..."
}
```

### POST /groups/remove-member

Remove a member from a group.

**Request:**
```json
{
  "groupId": "64a1...",
  "userId": "64a2..."
}
```

---

## Bookmark Endpoints

### POST /bookmarks

Create a bookmark.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "emoji",
  "content": "😊",
  "tags": ["happy", "greeting"]
}
```

**Response (201):**
```json
{ "bookmark": { ... } }
```

### GET /bookmarks

Get all bookmarks for the user.

**Query Parameters:** `type` (optional filter)

### DELETE /bookmarks/:bookmarkId

Delete a bookmark.

### PATCH /bookmarks/:bookmarkId/use

Increment bookmark usage count.

---

## Memory Endpoints

### GET /memory/search

Search memories by text.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| q | string | Search query |
| chatId | string | Filter by chat |

**Response (200):**
```json
{
  "results": [
    {
      "textSnippet": "...",
      "messageType": "text",
      "message": { ... },
      "confidence": 0.85
    }
  ]
}
```

### GET /memory

Get all memories for the user.

### POST /memory/:memoryId/verify

Request verification of a memory.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "memory": { ... } }
```

### POST /memory/:memoryId/respond

Respond to a verification request.

**Request:**
```json
{
  "status": "confirmed",
  "editedText": "Corrected text"
}
```

---

## Truth Endpoints

### POST /truth

Create a truth claim.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "messageId": "64a1...",
  "claimText": "The Earth is round"
}
```

**Response (201):**
```json
{ "claim": { ... } }
```

### GET /truth/:claimId

Get a truth claim.

### GET /truth/chat/:chatId

Get all claims for a chat.

### POST /truth/:claimId/vote

Vote on a truth claim.

**Request:**
```json
{
  "vote": 1,
  "comment": "Verified fact"
}
```

---

## Persona Endpoints

### POST /personas

Create a persona.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Professional",
  "tone": "professional",
  "customPrompt": "Respond in a formal business manner",
  "color": "#4f46e5"
}
```

**Response (201):**
```json
{ "persona": { ... } }
```

### GET /personas

Get all personas for the user.

### PATCH /personas/:personaId

Update a persona.

### DELETE /personas/:personaId

Delete a persona.

### POST /personas/:personaId/activate

Set a persona as active.

---

## Decide Endpoints

### POST /decide/:chatId/trigger

Trigger a decision poll.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "summary": "Where should we eat?",
  "options": ["Pizza", "Sushi", "Burgers"],
  "expiresIn": 3600
}
```

**Response (201):**
```json
{ "decision": { ... } }
```

### POST /decide/:decisionId/vote

Vote on a decision.

**Request:**
```json
{ "optionIndex": 0 }
```

### GET /decide/:decisionId

Get a decision.

### GET /decide/chat/:chatId

Get all decisions for a chat.

---

## Ghost Endpoints

### POST /ghost

Create a ghost session (ephemeral collaborative space).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "chatId": "64a1...",
  "type": "whiteboard",
  "ttl": 3600
}
```

**Response (201):**
```json
{ "session": { ... } }
```

### GET /ghost/:chatId

Get ghost sessions for a chat.

### DELETE /ghost/:id

Destroy a ghost session.

---

## Upload Endpoints

### POST /upload

Upload a file.

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| file | file | The file to upload |

**Response (200):**
```json
{
  "url": "https://res.cloudinary.com/...",
  "fileName": "photo.jpg",
  "fileSize": 1024000,
  "fileType": "image/jpeg"
}
```

---

## Feedback Endpoint (NEW)

### POST /feedback

Record user feedback on a recommendation.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "emoji",
  "itemId": "😊",
  "itemText": "😊",
  "action": "accepted",
  "context": {
    "chatId": "64a1...",
    "messageId": "64a2...",
    "emotion": "happy",
    "state": "discussion",
    "topic": "general"
  }
}
```

**Valid actions:** `accepted`, `dismissed`, `viewed`

**Response (201):**
```json
{ "feedback": { ... } }
```

**CURL Example:**
```bash
curl -X POST http://localhost:5000/api/feedback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"emoji","itemId":"😊","action":"accepted","context":{"emotion":"happy"}}'
```

---

## Analytics Endpoints (NEW)

### GET /analytics/dashboard

Get dashboard metrics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "totalRequests": 1234,
  "activeUsers": 56,
  "avgResponseTime": 245,
  "cacheHitRate": 0.72,
  "providerUsage": {
    "gemini": 850,
    "groq": 320,
    "huggingface": 64
  }
}
```

### GET /analytics/accuracy

Get accuracy report.

**Query Parameters:** `type`, `period` (hours, default 24)

### GET /analytics/providers

Get provider health report.

### GET /analytics/latency

Get latency report.

### GET /analytics/cache

Get cache hit rate report.

### GET /analytics/cost

Get cost report.

---

## DNA Endpoints (NEW)

### GET /dna

Get the full Conversation DNA profile for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "profile": {
    "user": "64a1...",
    "version": 2,
    "language": { "primary": "en", "confidence": 0.85 },
    "writingStyle": {
      "avgMessageLength": 45,
      "preferredReplyLength": "medium",
      "formalScore": 0.3,
      "casualScore": 0.8,
      "humorScore": 0.6,
      "kindnessScore": 0.7,
      "positivityScore": 0.75,
      "emojiFrequency": 0.4
    },
    "contentPreferences": {
      "topEmojis": [{ "emoji": "😂", "count": 42 }],
      "favoriteTopics": [{ "value": "technology", "count": 15 }]
    },
    "behavioralPatterns": {
      "conversationRhythm": "fast_responsive",
      "activeHours": [10, 11, 14, 15, 20, 21],
      "morningActivity": 25,
      "eveningActivity": 40
    },
    "metadata": {
      "totalMessages": 342,
      "totalConversations": 28,
      "lastUpdated": "2026-07-09T..."
    }
  }
}
```

### GET /dna/recommendations

Get recommendation-relevant DNA profile.

**Response (200):**
```json
{
  "profile": {
    "topEmojis": ["😂", "❤️", "😊"],
    "topTopics": ["technology", "music"],
    "writingStyle": {
      "formality": 0.3,
      "humor": 0.6,
      "positivity": 0.75,
      "romantic": 0.2,
      "emojiPreference": 0.4
    },
    "language": "en",
    "activeHour": 14,
    "rhythm": "fast_responsive",
    "confidence": 0.85
  }
}
```

### GET /dna/writing-style

Get writing style profile only.

**Response (200):**
```json
{
  "style": {
    "preferredReplyLength": "medium",
    "formality": 0.3,
    "humor": 0.6,
    "kindness": 0.7,
    "positivity": 0.75,
    "creativity": 0.5,
    "romantic": 0.2,
    "professional": 0.3,
    "emojiFrequency": 0.4,
    "questionFrequency": 0.35,
    "confidence": 0.85
  }
}
```

### GET /dna/activity

Get behavioral activity profile.

**Response (200):**
```json
{
  "activity": {
    "morningActivity": 25,
    "afternoonActivity": 30,
    "eveningActivity": 40,
    "nightActivity": 5,
    "conversationRhythm": "fast_responsive",
    "activeHours": [10, 11, 14, 15, 20, 21]
  }
}
```

### GET /dna/top-emojis

Get top used emojis.

**Query Parameters:** `limit` (default 5)

**Response (200):**
```json
{
  "emojis": ["😂", "❤️", "😊", "👍", "🔥"]
}
```

### POST /dna/reset

Reset Conversation DNA to default values.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "DNA reset successfully",
  "dna": { ... }
}
```

---

## Orchestrator Endpoints (NEW)

### GET /orchestrator/suggestions/:chatId

Get intelligent suggestions from the orchestrator (combines all engines).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "analysis": {
    "emotion": { "emotion": "happy", "confidence": 0.8 },
    "emotionTrend": "improving",
    "dominantEmotion": "joyful",
    "conversationState": "discussion",
    "relationship": "friend",
    "topic": "technology",
    "momentum": "moderate",
    "predictions": { ... },
    "conversationContext": "..."
  },
  "recommendations": {
    "emoji": [...],
    "sticker": [...],
    "shayari": [...],
    "song": [...],
    "reply": [...]
  },
  "predictions": {
    "nextEmotion": { "emotion": "excited", "confidence": 0.6 },
    "nextState": { "state": "celebration", "confidence": 0.4 },
    "nextTopic": { "topic": "technology", "isChange": false, "confidence": 0.7 },
    "nextReply": { "text": "That's amazing!", "suggestions": [...], "confidence": 0.7 },
    "nextGif": { "query": "happy", "confidence": 0.6 },
    "nextEmoji": { "emoji": "🎉", "confidence": 0.65 },
    "conversationOutcome": { "likelyOutcome": "positive engagement", "confidence": 0.6 }
  },
  "health": {
    "overallScore": 78,
    "dimensions": { ... },
    "risks": [...],
    "suggestions": [...]
  },
  "explanations": [...],
  "performance": { "totalMs": 45 }
}
```

### GET /orchestrator/predictions/:chatId

Get future predictions for a conversation.

**Response (200):**
```json
{
  "predictions": {
    "nextEmotion": { ... },
    "nextState": { ... },
    "nextTopic": { ... },
    "nextReply": { ... },
    "nextGif": { ... },
    "nextEmoji": { ... },
    "nextSong": { ... },
    "conversationOutcome": { ... }
  }
}
```

### GET /orchestrator/health/:chatId

Get conversation health analysis.

**Response (200):**
```json
{
  "health": {
    "overallScore": 78,
    "dimensions": {
      "friendliness": { "score": 82, "trend": "improving" },
      "toxicity": { "score": 95, "trend": "stable" },
      "respect": { "score": 88, "trend": "stable" },
      "positivity": { "score": 75, "trend": "improving" },
      "empathy": { "score": 65, "trend": "stable" },
      "trust": { "score": 72, "trend": "improving" },
      "excitement": { "score": 60, "trend": "stable" },
      "awkwardness": { "score": 85, "trend": "declining" }
    },
    "qualityScore": { "overall": 70, "depth": 65, "engagement": 75 },
    "risks": [...],
    "suggestions": [...]
  }
}
```

### GET /orchestrator/dna

Get Conversation DNA via the orchestrator.

**Response (200):**
```json
{ "dna": { ... } }
```

### GET /orchestrator/analytics

Get analytics via the orchestrator.

### POST /orchestrator/process

Process a message through all intelligence engines (async).

**Request:**
```json
{
  "chatId": "64a1...",
  "messageId": "64a2..."
}
```

**Response (200):**
```json
{ "queued": true }
```

---

## User Endpoints

### GET /users/search

Search users by username.

**Query Parameters:** `q` (search query)

### GET /users/me

Get current user profile.

### PUT /users/profile

Update user profile (detailed).

### PUT /users/preferences

Update user preferences.

**Request:**
```json
{
  "appearance": { "fontSize": "large" },
  "notifications": { "soundEnabled": false }
}
```

### PUT /users/password

Change password.

**Request:**
```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newPass456"
}
```

### DELETE /users/account

Delete user account.

### GET /users/sessions

Get active sessions.

### POST /users/logout-other

Logout all other sessions.

---

## Health Endpoint

### GET /health

Get system health status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-07-09T...",
  "uptime": 3600,
  "mongodb": {
    "status": "connected",
    "version": "7.0.0",
    "host": "localhost",
    "port": 27017,
    "name": "emotune"
  },
  "cache": {
    "status": "memory_only",
    "memoryEntries": 145
  },
  "redis": {
    "configured": true,
    "status": "memory_only"
  },
  "system": {
    "platform": "win32",
    "memory": { "total": 16252928, "free": 4194304, "usagePercent": "74.20" },
    "cpu": { "model": "...", "cores": 8 }
  },
  "connections": {
    "mongodb": 1,
    "totalOpenHandles": 23
  },
  "metrics": {
    "totalAiCalls": 1234,
    "geminiCalls": 850,
    "groqCalls": 320,
    "huggingfaceCalls": 64,
    "cacheHits": 450,
    "cacheMisses": 784,
    "avgLatency": 245
  }
}
```

---

## Socket.IO Events

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `typing:start` | `{ chatId }` | User started typing |
| `typing:stop` | `{ chatId }` | User stopped typing |
| `memory:verifyRequest` | `{ memoryId, textSnippet, chatId }` | Request memory verification |
| `memory:verifyResponse` | `{ memoryId, status, editedText, chatId }` | Respond to verification |
| `ghost:join` | `{ sessionId }` | Join a ghost session |
| `ghost:sync` | `{ sessionId, data }` | Sync ghost session data |
| `ghost:leave` | `{ sessionId }` | Leave a ghost session |
| `decision:vote` | `{ decisionId, optionIndex }` | Vote on a decision |
| `message:delivered` | `{ messageIds, chatId }` | Acknowledge message delivery |
| `join:chat` | `{ chatId }` | Join a chat room |
| `leave:chat` | `{ chatId }` | Leave a chat room |
| `join:decision` | `{ decisionId }` | Join a decision room |
| `leave:decision` | `{ decisionId }` | Leave a decision room |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |
| `onlineUsers:list` | `{ onlineUserIds: [] }` | List of online users |
| `typing:start` | `{ userId, chatId }` | Someone started typing |
| `typing:stop` | `{ userId, chatId }` | Someone stopped typing |
| `memory:verifyRequest` | `{ memoryId, textSnippet, requestedBy }` | Verification requested |
| `memory:verifyResponse` | `{ memoryId, status, editedText, respondedBy }` | Verification response |
| `ghost:userJoined` | `{ userId }` | User joined ghost session |
| `ghost:sync` | `{ userId, data }` | Ghost session data sync |
| `ghost:userLeft` | `{ userId }` | User left ghost session |
| `decision:vote` | `{ decisionId, optionIndex, userId }` | Someone voted |
| `message:delivered` | `{ messageIds, userId }` | Message delivery confirmed |

---

## Common Error Responses

```json
{
  "error": "Error message description"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, etc.) |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |
