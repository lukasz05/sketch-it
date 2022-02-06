FROM node:16

WORKDIR /

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 8080
CMD ["node", "src/app.js"]
