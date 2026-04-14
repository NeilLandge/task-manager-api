FROM node:20-alpine AS dependencies
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test

FROM node:20-alpine AS production
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs
WORKDIR /app
COPY --from=dependencies --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --chown=appuser:nodejs package*.json ./
COPY --chown=appuser:nodejs src/ ./src/
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]
