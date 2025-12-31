FROM node:20-alpine AS base

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL=https://api.convoo.cloud
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_META_APP_ID
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID

ARG NEXT_PUBLIC_META_CONFIG_ID
ENV NEXT_PUBLIC_META_CONFIG_ID=$NEXT_PUBLIC_META_CONFIG_ID

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

# Build (creates standalone output with baked-in env vars)
RUN npm run build

# Production stage - use standalone output
FROM node:20-alpine AS production

WORKDIR /app

# Copy standalone output
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Run the standalone server
CMD ["node", "apps/web/server.js"]
