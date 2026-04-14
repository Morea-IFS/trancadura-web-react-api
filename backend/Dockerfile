# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Instala dependências do sistema necessárias para o Prisma e Python (se necessário no futuro)
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copia arquivos de definição de pacotes e o schema do Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copia o restante do código fonte
COPY . .

# Gera o cliente do Prisma
RUN npx prisma generate

# Compila o projeto NestJS
RUN npm run build

# Remove as devDependencies para reduzir o tamanho da imagem final
RUN npm prune --production

# Stage 2: Production
FROM node:22-slim

WORKDIR /app

# Instala dependências mínimas para rodar o app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=8080

# Porta exposta (conforme seu main.ts)
EXPOSE 8080

# Comando para iniciar a aplicação
CMD ["npm", "run", "start:prod"]
