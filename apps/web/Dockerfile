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

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/apps/web/.next ./.next
COPY --from=base /app/apps/web/public ./public
COPY --from=base /app/apps/web/package*.json ./
COPY --from=base /app/apps/web/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
