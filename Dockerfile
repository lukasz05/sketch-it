FROM node:16

WORKDIR /

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 8080
CMD ["npm", "start"]