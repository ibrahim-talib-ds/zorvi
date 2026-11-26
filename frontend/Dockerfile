FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Required: public URL of the FastAPI API, including /api/v1.
ARG NEXT_PUBLIC_API_BASE
RUN test -n "$NEXT_PUBLIC_API_BASE" || (echo "NEXT_PUBLIC_API_BASE must be set to the deployed API URL" >&2 && exit 1)
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]
