# Dev-mode frontend image (Vite dev server with HMR).
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
