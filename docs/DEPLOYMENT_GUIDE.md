# Deployment Guide

## Docker Deployment

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+

### Build and Run

```bash
# Clone and configure
git clone https://github.com/your-org/emotune.git
cd emotune
cp .env.example .env
# Edit .env with your production values

# Build and start all services
docker compose up -d

# Check status
docker compose ps
docker compose logs -f server
```

The `docker-compose.yml` starts three services:
- **mongodb** – MongoDB 7 on port 27017
- **redis** – Redis 7 on port 6379 (Alpine)
- **server** – Express API on port 5000

The server waits for both MongoDB and Redis to be healthy before starting.

### Dockerfile

The `Dockerfile` uses a multi-stage build:

```dockerfile
# Stage 1: Install production dependencies only
FROM node:18-alpine AS build
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime image
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/node_modules ./node_modules
COPY server/ .
ENV NODE_ENV=production
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
CMD ["node", "server.js"]
```

### Configuration

Create a `.env` file in the project root (it's automatically loaded by the server container):

```bash
docker compose run --rm server node -e "console.log(process.env.MONGO_URI)"
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **Server** | | | |
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `LOG_LEVEL` | No | debug | Logging verbosity |
| `CLIENT_URL` | No | http://localhost:5173 | CORS origin |
| **MongoDB** | | | |
| `MONGO_URI` | Yes | mongodb://localhost:27017/emotune | MongoDB connection string |
| **Redis** | | | |
| `REDIS_URL` | No | redis://localhost:6379 | Redis connection string |
| `CACHE_TTL` | No | 3600 | Default cache TTL (seconds) |
| `RESPONSE_CACHE_TTL` | No | 300 | AI response cache TTL (seconds) |
| `SEMANTIC_CACHE_TTL` | No | 86400 | Semantic cache TTL (seconds) |
| **JWT** | | | |
| `JWT_SECRET` | Yes | change-me-in-production | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | change-me-refresh | Refresh token signing secret |
| `JWT_EXPIRY` | No | 7d | Access token expiry |
| `JWT_REFRESH_EXPIRY` | No | 30d | Refresh token expiry |
| **AI – Google Gemini** | | | |
| `GEMINI_API_KEY` | No | - | Gemini API key (free tier available) |
| `GEMINI_DEFAULT_MODEL` | No | gemini-2.5-flash | Default Gemini model |
| `GEMINI_EMBEDDING_MODEL` | No | text-embedding-004 | Embedding model for vector search |
| `GEMINI_MODELS` | No | auto-discovered | Comma-separated model list |
| `GEMINI_TIMEOUT` | No | 4000 | Request timeout (ms) |
| `GEMINI_RETRIES` | No | 1 | Retry attempts |
| **AI – Groq** | | | |
| `GROQ_API_KEY` | No | - | Groq API key (free: 14400 req/day) |
| `GROQ_DEFAULT_MODEL` | No | deepseek-r1-distill-llama-70b | Default Groq model |
| `GROQ_MODELS` | No | priority list | Comma-separated model list |
| `GROQ_TIMEOUT` | No | 5000 | Request timeout (ms) |
| `GROQ_RETRIES` | No | 1 | Retry attempts |
| **AI – HuggingFace** | | | |
| `HUGGINGFACE_API_KEY` | No | - | HuggingFace API key |
| `HF_DEFAULT_MODEL` | No | meta-llama/Meta-Llama-3-8B-Instruct | Default HF model |
| `HF_TIMEOUT` | No | 8000 | Request timeout (ms) |
| **AI – Global Settings** | | | |
| `AI_TIMEOUT` | No | 4000 | Global AI request timeout |
| `AI_RETRIES` | No | 1 | Global retry attempts |
| `AI_MAX_TOKENS` | No | 500 | Max tokens per response |
| `AI_TEMPERATURE` | No | 0.7 | Response creativity |
| `AI_REQUESTS_PER_MIN` | No | 20 | Rate limit per user |
| `AI_BURST_SIZE` | No | 5 | Rate limit burst |
| **Circuit Breaker** | | | |
| `CB_FAILURE_THRESHOLD` | No | 3 | Failures before circuit opens |
| `CB_SUCCESS_THRESHOLD` | No | 2 | Successes before circuit closes |
| `CB_HALF_OPEN_MAX` | No | 1 | Test requests in half-open |
| `CB_OPEN_TIMEOUT_MS` | No | 30000 | Time before half-open (ms) |
| **Media** | | | |
| `CLOUDINARY_CLOUD_NAME` | No | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | - | Cloudinary API secret |
| `GIPHY_API_KEY` | No | - | Giphy API key (GIF search) |
| `YOUTUBE_API_KEY` | No | - | YouTube Data API key |
| `PEXELS_API_KEY` | No | - | Pexels video API key |
| `PIXABAY_API_KEY` | No | - | Pixabay video API key |
| `SPOTIFY_CLIENT_ID` | No | - | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | No | - | Spotify API client secret |
| **Other** | | | |
| `LIBRETRANSLATE_URL` | No | https://libretranslate.de | Translation service URL |

---

## MongoDB Atlas Setup

### 1. Create a Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free M0 cluster (or paid tier for production)
3. Choose a cloud provider and region close to your users

### 2. Configure Network Access

```
Network Access → Add IP Address → 0.0.0.0/0 (for public access)
```
For production, restrict to your server's IP address.

### 3. Create Database User

```
Database Access → Add New Database User
- Username: emotune_admin
- Password: <generate strong password>
- Built-in Role: Atlas Admin
```

### 4. Get Connection String

```
Connect → Connect your application → Driver: Node.js
mongodb+srv://emotune_admin:<password>@cluster0.xxxxx.mongodb.net/emotune?retryWrites=true&w=majority
```

### 5. Set Environment Variable

```env
MONGO_URI=mongodb+srv://emotune_admin:your_password@cluster0.xxxxx.mongodb.net/emotune?retryWrites=true&w=majority
```

---

## Redis Setup

### Option 1: Redis Cloud (Managed)

1. Create an account at [Redis Cloud](https://redis.com/cloud/)
2. Create a free 30MB subscription
3. Note the `REDIS_URL` (e.g., `redis://default:password@host:port`)

### Option 2: Self-Hosted

```bash
# Ubuntu/Debian
apt-get install redis-server
systemctl enable redis
systemctl start redis

# Configure for production
# Edit /etc/redis/redis.conf:
#   requirepass your-strong-password
#   bind 127.0.0.1

redis-cli CONFIG SET requirepass "your-strong-password"
```

**Note:** Emotune works without Redis. The cache falls back to in-memory mode gracefully. Redis is recommended for production deployments with multiple server instances.

---

## AI Provider API Key Setup

### Gemini (Primary – Recommended)

```bash
# Go to https://aistudio.google.com/app/apikey
# Click "Create API Key"
# Copy the key

# Free tier: 1500 requests/day, no credit card required
GEMINI_API_KEY=AIzaSy...
```

### Groq (Secondary)

```bash
# Go to https://console.groq.com/keys
# Click "Create API Key"
# Free tier: 14400 requests/day, 30 req/min
GROQ_API_KEY=gsk_...
```

### HuggingFace (Tertiary Fallback)

```bash
# Go to https://huggingface.co/settings/tokens
# Create a new token with "read" access
# Free inference API with rate limits
HUGGINGFACE_API_KEY=hf_...
```

**Recommendation:** Configure at least **Gemini** for the app to function. Add Groq for redundancy. HuggingFace is optional and only used when both fail.

---

## Scaling Considerations

### Horizontal Scaling

Emotune can scale horizontally by running multiple server instances behind a load balancer:

```
┌─────────────┐     ┌──────────────┐
│  Load        │────▶│  Server 1    │
│  Balancer    │────▶│  Server 2    │────▶ MongoDB (shared)
│  (NGINX/HA)  │────▶│  Server N    │────▶ Redis (shared)
└─────────────┘     └──────────────┘
```

**Key considerations:**

| Component | Scaling Strategy |
|-----------|-----------------|
| **Server** | Stateless. Multiple instances behind load balancer. No session affinity needed. |
| **CIL State** | In-memory per instance. State is lost on restart but rebuilt from message history. |
| **Redis** | Single instance or Redis Cluster for high availability. |
| **MongoDB** | Replica set for redundancy. Sharding for very large datasets. |
| **Socket.IO** | Use Redis adapter for cross-instance WebSocket communication. |

### CIL State in Multi-Instance Deployments

The Conversation Intelligence Layer (CIL) keeps conversation state **in-memory** per server instance. In a multi-instance setup:

1. Each instance builds its own CIL state from message history
2. State is not shared between instances
3. On restart, state is rebuilt from MongoDB messages
4. For production, consider implementing CIL state persistence or externalization

### Redis Clustering

For high-availability Redis:

```bash
# docker-compose.yml addition for Redis Cluster
redis:
  image: redis:7-alpine
  command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
  ports:
    - '6379:6379'
  volumes:
    - redis_data:/data
```

Update the `REDIS_URL` to point to the cluster.

---

## Monitoring

### Health Endpoint

```
GET /api/health
```

Returns:
- `status` – "ok", "degraded", or "down"
- MongoDB connection state
- Redis connection state (or "memory_only")
- System metrics (memory, CPU, uptime)
- Open connections and handles
- AI provider metrics (total calls, cache hit rate, avg latency)

### Docker Healthcheck

The Dockerfile includes a HEALTHCHECK that pings the health endpoint every 30 seconds:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
```

### Logging

Logs are written to:
- **Console** (stdout) – All environments
- **File** – `server/logs/` directory (if configured)

Log format: `[TIMESTAMP] [LEVEL] [FILE:LINE] Message { metadata }`

### Metrics

The `/api/ai/metrics` endpoint (admin only) returns:
- Total AI calls
- Calls per provider (Gemini, Groq, HuggingFace)
- Cache hit/miss counts
- Average latency per provider

### Monitoring Recommendations

| Tool | Purpose |
|------|---------|
| **Docker logs** | Container-level logging |
| **MongoDB Atlas Monitoring** | Database performance |
| **Redis Insight** | Cache performance |
| **Prometheus + Grafana** | Custom metrics (future) |

---

## Backup and Restore

### MongoDB Backup

```bash
# Backup all databases
mongodump --uri="mongodb://localhost:27017/emotune" --out=./backups/$(date +%Y%m%d)

# Backup specific collections
mongodump --uri="mongodb://localhost:27017/emotune" \
  --collection=messages --out=./backups/messages_$(date +%Y%m%d)
```

### MongoDB Restore

```bash
# Restore entire database
mongorestore --uri="mongodb://localhost:27017/emotune" ./backups/20260709/emotune

# Restore specific collection
mongorestore --uri="mongodb://localhost:27017/emotune" \
  --collection=messages ./backups/messages_20260709/emotune/messages.bson
```

### Docker Volume Backup

```bash
# Backup MongoDB data
docker run --rm -v emotune_mongodb_data:/data -v ./backups:/backup \
  alpine tar czf /backup/mongodb_$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm -v emotune_mongodb_data:/data -v ./backups:/backup \
  alpine tar xzf /backup/mongodb_20260709.tar.gz -C /data
```

### Automated Backup Script

Create a cron job:

```bash
#!/bin/bash
# /usr/local/bin/backup-emotune.sh
BACKUP_DIR="/var/backups/emotune"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# MongoDB
docker exec emotune-mongodb-1 mongodump \
  --uri="mongodb://localhost:27017/emotune" \
  --out=/tmp/backup_$DATE
docker cp emotune-mongodb-1:/tmp/backup_$DATE $BACKUP_DIR/mongodb_$DATE
docker exec emotune-mongodb-1 rm -rf /tmp/backup_$DATE

# Keep last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

---

## Troubleshooting Common Issues

### MongoDB Connection Failed

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED ::1:27017`

**Solutions:**
1. Ensure MongoDB is running: `docker compose ps mongodb`
2. Check connection string in `.env`
3. Verify network: `docker compose exec mongodb mongosh --eval "db.runCommand({ping:1})"`
4. On Windows, use `localhost` instead of `127.0.0.1`

### Redis Connection Failed

**Error:** `Redis unavailable, cache disabled`

**Solutions:**
1. The app falls back to in-memory cache – this is not critical
2. To use Redis: `docker compose up -d redis`
3. Check `REDIS_URL` in `.env`

### AI Provider Not Configured

**Error:** `No AI providers configured. Check your .env file for API keys.`

**Solution:** At minimum, set `GEMINI_API_KEY` in `.env`:
```env
GEMINI_API_KEY=AIzaSy...
```

### All AI Providers Failed

**Error:** `All AI providers failed. Errors: [...]`

**Solutions:**
1. Check API key validity
2. Check rate limits (Gemini: 1500/day, Groq: 30/min)
3. Check circuit breaker status via `/api/ai/cache`
4. Increase provider timeout in `.env`
5. Add a secondary provider (Groq/HuggingFace)

### JWT Expired

**Error:** `jwt expired`

**Solution:** Use the refresh token endpoint:
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your_refresh_token>"}'
```

### Rate Limited

**Error:** `Too many requests, please try again later`

**Solution:** Wait for the rate limit window to reset (default: 1 minute). Adjust limits:
```env
AI_REQUESTS_PER_MIN=40
AI_BURST_SIZE=10
```

### File Upload Failed

**Error:** `File upload failed`

**Solutions:**
1. Check `CLOUDINARY_*` credentials (falls back to local storage)
2. Ensure `server/uploads/` directory exists and is writable
3. Check file size (limit: 10MB via `express.json({ limit: '10mb' })`)

### Socket.IO Connection Issues

**Error:** `WebSocket connection failed`

**Solutions:**
1. Ensure `CLIENT_URL` matches the client origin exactly
2. Check for proxy/firewall blocking WebSocket upgrade
3. Increase `pingTimeout` and `pingInterval` for slow connections
4. Use Redis adapter for multi-instance deployments

### Docker Build Fails

**Error:** `failed to solve: process "/bin/sh -c npm ci --only=production"`

**Solutions:**
1. Clear Docker build cache: `docker builder prune`
2. Check `server/package.json` syntax
3. Ensure `server/package-lock.json` exists
4. Try building without cache: `docker compose build --no-cache server`
