FROM node:10.5.0-alpine

RUN npm install -g yarn && \
    mkdir -p /app

COPY . /app
WORKDIR /app

RUN yarn && yarn run build && \
    echo "#!/bin/sh" > /start && \
    echo "set -e" >> /start && \
    echo 'STEAM_TOKEN=${STEAM_TOKEN//,/\", \"}' >> /start && \
    echo "sed -i \"s/YOUR_TOKEN/\$STEAM_TOKEN/g\" /app/config/default.json" >> /start && \
    echo "node /app/dist/index.js" >> /start && \
    chmod +x /start

CMD ["sh", "/start"]
