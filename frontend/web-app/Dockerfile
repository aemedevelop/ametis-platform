FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_CHAT_API_URL=/api/rag-chat
ARG NEXT_PUBLIC_CHAT_TENANT_ID=aeme
ARG NEXT_PUBLIC_AGENT_FACTORY_WEB_URL=http://localhost:3200
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_KEYCLOAK_AUTH_URL=http://localhost:8081/realms/ametis/protocol/openid-connect/auth
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=ametis-hub-web
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_CHAT_API_URL=${NEXT_PUBLIC_CHAT_API_URL}
ENV NEXT_PUBLIC_CHAT_TENANT_ID=${NEXT_PUBLIC_CHAT_TENANT_ID}
ENV NEXT_PUBLIC_AGENT_FACTORY_WEB_URL=${NEXT_PUBLIC_AGENT_FACTORY_WEB_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_KEYCLOAK_AUTH_URL=${NEXT_PUBLIC_KEYCLOAK_AUTH_URL}
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
ENV RAG_CHAT_API_URL=http://localhost:8000/tenants/aeme/agents/support_agent/knowledge-bases/landing/query
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
EXPOSE 3000
CMD ["npm", "start", "--", "-p", "3000"]
