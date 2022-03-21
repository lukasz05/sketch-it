FROM node:16

ARG SERVER_URL

COPY /common /common
COPY /client /client

WORKDIR /client

RUN npm ci
RUN npm run prettier
RUN npm run build


FROM nginx:alpine

COPY --from=0 /client/dist ./dist
COPY /client/nginx.conf /etc/nginx/nginx.conf