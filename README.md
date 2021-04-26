# flash-sale

this is a node test demo to simulate high-concurrency shopping scenarios used redis、kafka and mysql, all the program look like this:

[![](/public/img/framework.png "framework")]

## how to use:

1. clone to local and change the host to your server ip or "localhost" run locally in 'routes/flash-sale.js' and 'routes/flash-sale-consumer.js'
2. run 'docker-compse up -d'
3. post req, if build sucessfully, an order data will save in mysql 
4. you can use wrk to test the qps

## thanks:

https://github.com/harryluo163/miaosha.git
