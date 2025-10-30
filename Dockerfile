# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
# only prod deps for a slim image
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# copy compiled dist only
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node","dist/main.js"]
