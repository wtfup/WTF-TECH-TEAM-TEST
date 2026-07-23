# Dev-mode backend image (hot reload via ts-node-dev). Optimize for production
# yourself if you like — call it out in ARCHITECTURE.md.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8080
CMD ["npm", "run", "dev"]
