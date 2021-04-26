FROM node:14.5.0

RUN mkdir -p /home/workspace/flash_sale_example
WORKDIR /home/workspace/flash_sale_example

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

EXPOSE 8081
CMD npm start
