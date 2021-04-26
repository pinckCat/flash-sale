var express = require('express');
var router = express.Router();

const redis = require("redis");

var kafka = require("kafka-node"),
    Producer = kafka.Producer,
    kafkaClient = new kafka.KafkaClient({kafkaHost: '81.70.204.243:9092'}),
    producer = new Producer(kafkaClient);

const redisClient = redis.createClient(6379, "81.70.204.243");

kafkaClient.on('error', function (err) {
    console.error(err);
})

redisClient.on("error", function (error) {
    console.error(error);
    throw error;
})

router.post("/", function (req, res) {
    redisClient
        .multi()
        .decr("inStock")
        .exec(function (err, replies) {
            if (err) {
                //断开redis连接
                redisClient.end(true);
                throw err;
            } else {
                if (replies[0] >= 0) {
                    let payload = [{
                        topic: 'flash-order',
                        messages: JSON.stringify({"user_id": 1, "address_id": 1, "product_name": '买个锤子', "product_price": 9.9, "status": 0}),
                        partition: 0
                    }];
                    producer.send(payload, function (err, data) {
                        if (err) {
                            console.error(err);
                            throw err;
                        }
                        console.log('购买成功，还是剩'+replies[0]+'个');
                    });
                } else {
                    console.log('抢完了，下次再来');
                }
            }
        });
    res.send('respond with a resource');
});

module.exports = router;



