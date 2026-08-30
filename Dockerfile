# syntax=docker/dockerfile:1.7
#
# The agency application: a static bundle behind nginx.
#
# Build from the directory holding both repositories, because the SDK is a
# local dependency:
#   docker build -f alm-web/Dockerfile -t alm-web .
#
# The API URL is baked in at build time — Vite inlines it — so an image is tied
# to one environment. That is a real constraint and the alternative is worse:
# fetching configuration at runtime costs every visitor a round trip before the
# app can start.
FROM node:22-alpine AS build
WORKDIR /app

COPY alm-sdk ./alm-sdk
WORKDIR /app/alm-sdk
RUN npm install --no-audit --no-fund && npm run build

WORKDIR /app/alm-web
COPY alm-web/package.json ./
RUN npm install --no-audit --no-fund
COPY alm-web ./

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/alm-web/dist /usr/share/nginx/html
COPY alm-infra/deploy/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
