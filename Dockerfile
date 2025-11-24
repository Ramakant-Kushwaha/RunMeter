# Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
RUN ng build --configuration production

# Stage 2: serve
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist/run-meter/browser /usr/share/nginx/html/
EXPOSE 80