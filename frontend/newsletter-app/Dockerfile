FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_NEWSLETTER_API_BASE_URL=http://localhost:8082
ARG NEXT_PUBLIC_NEWSLETTER_WEB_URL=http://localhost:3100
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_KEYCLOAK_AUTH_URL=http://localhost:8081/realms/ametis/protocol/openid-connect/auth
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=newsletter-web
ENV NEXT_PUBLIC_NEWSLETTER_API_BASE_URL=${NEXT_PUBLIC_NEWSLETTER_API_BASE_URL}
ENV NEXT_PUBLIC_NEWSLETTER_WEB_URL=${NEXT_PUBLIC_NEWSLETTER_WEB_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_KEYCLOAK_AUTH_URL=${NEXT_PUBLIC_KEYCLOAK_AUTH_URL}
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3100
CMD ["npm", "start", "--", "-p", "3100"]
