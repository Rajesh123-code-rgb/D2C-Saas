FROM node:20-alpine AS base

WORKDIR /app

# Copy root package files and tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Install root dependencies
RUN npm install

# Copy web app source
COPY apps/web ./apps/web

# Install web dependencies
WORKDIR /app/apps/web
RUN npm install

# Build (creates standalone output)
RUN npm run build

# Production stage - use standalone output
FROM node:20-alpine AS production

WORKDIR /app

# Copy standalone output (includes necessary node_modules)
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./.next/static
COPY --from=base /app/apps/web/public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Run the standalone server directly
CMD ["node", "server.js"]
