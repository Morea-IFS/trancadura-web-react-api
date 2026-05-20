FROM node:20-alpine
ENV CACHE_BUSTER=2

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/src/main.js"]