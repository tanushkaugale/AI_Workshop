# ==============================================================================
# Multi-Stage Dockerfile for Sanjivani MCP AI Platform
# Optimized for AWS App Runner, Amazon ECS Fargate, and Elastic Beanstalk
# ==============================================================================

# STAGE 1: Build Angular Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# STAGE 2: Production Server Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source code & configuration
COPY tsconfig.json ./
COPY server.ts ./
COPY client.ts ./
COPY api-server.ts ./
COPY schema.sql ./

# Copy compiled Angular static assets from builder stage
COPY --from=frontend-builder /app/frontend/dist/frontend/browser ./frontend/dist/frontend/browser

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start Express API Server with tsx (or node)
CMD ["npx", "tsx", "api-server.ts"]
