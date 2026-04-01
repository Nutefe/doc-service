# Use an official Node.js runtime as a parent image
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker
RUN npm run build

FROM node:22-alpine AS doc-service
WORKDIR /app
RUN apk add --no-cache tini
ENV NODE_ENV=production
COPY --from=base /app/package.json /app/package-lock.json* ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","dist/src/server.js"]

FROM node:22-alpine AS worker
WORKDIR /app
RUN apk add --no-cache tini
ENV NODE_ENV=production
COPY --from=base /app/package.json /app/package-lock.json* ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","dist/worker/worker.js"]