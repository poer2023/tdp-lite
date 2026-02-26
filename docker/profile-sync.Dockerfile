FROM node:20-alpine

WORKDIR /app
COPY scripts/profile-sync.mjs /app/scripts/profile-sync.mjs

ENTRYPOINT ["node", "/app/scripts/profile-sync.mjs", "--loop"]
