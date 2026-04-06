FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

RUN npm run db:migrate

EXPOSE 3000
CMD ["node", "dist/index.js"]
