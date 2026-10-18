# Contexto de build: a raiz do repositório (docker build -f render/Dockerfile .)
FROM node:22-slim
WORKDIR /app
COPY ezf/package.json ezf/package-lock.json* ezf/
RUN cd ezf && npm install --omit=dev
COPY ezf ezf
COPY render render
ENV HOST=0.0.0.0 PORT=3100
EXPOSE 3100
CMD ["node", "render/server.js"]
