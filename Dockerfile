FROM node:10.5.0-alpine

RUN npm install -g yarn && \
    mkdir -p /app

COPY . /app
WORKDIR /app

RUN yarn && \
    echo "#!/bin/sh" > /start && \
    echo "set -e" >> /start && \
    echo "sed -i \"s/'YOUR_TOKEN'/'\$STEAM_TOKEN'/g\" /app/src/index.ts" >> /start && \
    echo "yarn run build" >> /start && \
    echo "node /app/dist/index.js" >> /start && \
    chmod +x /start

CMD ["sh", "/start"]
