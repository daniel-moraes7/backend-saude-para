FROM node:18-alpine

WORKDIR /app

# Primeiro copiamos os arquivos de configuração E o código fonte
COPY package*.json tsconfig*.json ./
COPY src/ ./src/

# Agora instalamos as dependências
RUN npm install

# Copiar outros arquivos de configuração
COPY .env* ./
COPY config* ./config/

# Limpar dependências de desenvolvimento
RUN npm prune --production

EXPOSE 3001

CMD ["npm", "start"]