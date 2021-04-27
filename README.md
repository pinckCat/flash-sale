# flash-sale

this is a node test demo to simulate high-concurrency shopping scenarios used redis、kafka and mysql, all the program look like this:

[![](/public/img/framework.png "framework")]

# how to use:
```
1. clone and change the host to your server host or "localhost" if run locally in the file 'routes/flash-sale.js' and 'routes/flash-sale-consumer.js'
2. run 'docker-compse up -d' to run all the containner
3. post a req to the url 'http://yourIp:8081/flashSale', if build sucessfully, an order data will save in mysql 
4. you can use wrk to test the qps
```

# note:
```
1. the default inventory is 2000 which set in redis and the default expire time in redis is very short
2. if you want to attach the mysql container, run 'docker-compose exec mysql mysql -uroot -p123456', and the database named 'flash_sale', order data save in table 'orders', all created automatically when the mysql container run
3. run docker exec -it [redis container id] redis-cli to attach redis container
4. run docker-compose exec kafka /bin/bash to attach kafka container
```
# thanks

https://github.com/harryluo163/miaosha.git
