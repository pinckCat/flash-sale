FROM node:latest

RUN mkdir -p /home/workspace/flash_sale_example
WORKDIR /home/workspace/flash_sale_example

COPY . .

RUN npm install

EXPOSE 8081
CMD npm start
