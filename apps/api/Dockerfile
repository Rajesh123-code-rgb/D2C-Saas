FROM node:20-alpine AS base

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy API source
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Install API dependencies
WORKDIR /app/apps/api
RUN npm install

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/node_modules ./node_modules
COPY --from=base /app/apps/api/package*.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main"]
