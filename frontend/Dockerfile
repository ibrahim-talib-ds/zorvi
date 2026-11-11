FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

COPY . .

# Use the public backend URL for the browser
ENV NEXT_PUBLIC_API_URL="http://lkgf3nkt0ugn23cvidfqhnci.172.21.0.1.sslip.io"
ENV NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/app/fontmock.js

RUN npm run build

FROM node:20 AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
