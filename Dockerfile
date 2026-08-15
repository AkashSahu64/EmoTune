FROM node:18-alpine AS build

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

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
