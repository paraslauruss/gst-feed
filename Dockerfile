FROM node:20-alpine

# 1. Install required Linux packages
RUN apk add --no-cache openssl

# 2. Set working directory
WORKDIR /app

# 3. Copy dependency files first
COPY package.json package-lock.json* ./

# 4. ⚠️ TEMPORARILY REMOVE NODE_ENV to install devDependencies
# (Tailwind, postcss etc. are dev dependencies)
RUN npm ci && npm cache clean --force

# 5. Remove Shopify CLI (optional)
RUN npm remove @shopify/cli || true

# 6. Copy rest of the app
COPY . .

# 7. Generate Prisma Client
RUN npx prisma generate

# 8. Build Remix App — now dev dependencies (tailwind) are available
RUN npm run build

# 9. Now it's safe to set NODE_ENV
ENV NODE_ENV=production

# 10. Start app
CMD ["npm", "run", "docker-start"]
