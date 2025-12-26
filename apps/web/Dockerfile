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

# In monorepo, standalone output structure is:
# .next/standalone/ - contains server.js and node_modules
# .next/standalone/apps/web/.next/ - contains app build
# We need to copy the entire standalone folder and static/public from original location

COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Run the standalone server
CMD ["node", "apps/web/server.js"]
