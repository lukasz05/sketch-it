FROM node:16

COPY /common /common
COPY /server /server

WORKDIR /server

RUN npm ci
RUN npm run prettier
RUN npm run lint 
RUN npm run test
ENTRYPOINT npm run start
