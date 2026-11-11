FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./

# Tell npm to be patient with slow internet
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

COPY . .

# Force Next.js to use the mock file instead of downloading Google Fonts
ENV NEXT_FONT_GOOGLE_MOCKED_RESPONSES=./fontmock.js

RUN npm run build

FROM node:20 AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
