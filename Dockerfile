# Usar uma imagem base Node.js oficial
FROM node:18-alpine

# Criar e definir o diretório de trabalho
WORKDIR /app

# Copiar os arquivos package.json e package-lock.json
COPY package*.json ./

# Instalar as dependências
RUN npm install --production

# Copiar todo o conteúdo da build
COPY dist/ ./dist/

# Copiar arquivos de configuração se existirem
COPY .env* ./
COPY config* ./config/

# Expor a porta que sua API usa
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]