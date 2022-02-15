FROM node:14-slim

WORKDIR /app

COPY . .

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init
ENTRYPOINT ["dumb-init", "--"]

RUN yarn 
RUN yarn build 
RUN cd ./packages/graphql 
RUN yarn pack
RUN mv *.tgz ../tests/headless-test/ 
RUN cd ./tests/headless-test/
RUN tar -xvzf *.tgz
RUN cd package 
RUN npm run remove:graphql-plugin-auth 
RUN cd ../
RUN npm install 
RUN cd ./browser 
RUN npm install 
RUN npx webpack
RUN cd ../ && npm run test