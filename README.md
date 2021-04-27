# flash-sale

this is a node test demo to simulate high-concurrency shopping scenarios used redis、kafka and mysql, all the program look like this:

[![](/public/img/framework.png "framework")]

# how to use:
1. clone and change the host to your server host or "localhost" if run locally in the file 'routes/flash-sale.js' and 'routes/flash-sale-consumer.js'
2. run 'docker-compse up -d' to run all the containner
3. post a req to the url 'http:ip:8081/flashSale', if build sucessfully, an order data will save in mysql 
4. you can use wrk to test the qps
# thanks:

https://github.com/harryluo163/miaosha.git
