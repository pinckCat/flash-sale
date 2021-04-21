var express = require('express');
var router = express.Router();

var redis = require("redis");

var kafka = require("kafka-node"),
    Producer = kafka.Producer,
    kafkaClient = new kafka.KafkaClient({kafkaHost: 'host'}),
    producer = new Producer(kafkaClient);

const redisClient = redis.createClient(6379, "redis");

router.post("/flashSale", function (req, res) {
    redisClient.multi().get('inStock').decr('inStock').execAsync().then(function (err, replies) {
        if (err) {
            console.error(err);
            redisClient.end(true);
            return;
        } else {
            if (replies[1] >= 0) {
                let payload = [{
                    topic: 'FLASH_ORDER',
                    message: {'user_id': 1, 'address_id': 1, 'product_name': '买个锤子', 'product_price': 9.9, 'status': 0},
                    partition: 0
                }];
                producer.send(payload, function (err, data) {
                    if (err) {
                        console.error(err);
                        throw err;
                        return;
                    }
                    console.log(data);
                    console.log('购买成功，还是剩'+replies[1]+'个');
                });
            } else {
                console.log('抢完了，下次再来');
            }
        }
    });
});

module.exports = router;



