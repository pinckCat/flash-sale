var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    kafkaClient = new kafka.KafkaClient('ip');

var async = require('async');

var mysql = require('mysql'),
    connection = mysql.createConnection({
        host: 'mysql',
        user: 'root',
        password: '123456',
        database: 'flash_sale'
    });


connection.connect();
var messageOffset = 0;

//定义一个队列保存数据，kafka consumer 收到数据后,将对应的数据插入mysql数据库
var q = async.queue(function (message, callback) {
    console.log('hello'+ message.name);
    connection.query("INSERT INTO orders SET ?", {
        user_id: message.user_id,
        address_id: message.address_id,
        product_name: message.product_name,
        product_price: message.product_price,
        status: message.status
    }, function (error, results, fields) {
        if (error) {
            console.error(error);
            throw error;
        }
        callback();
    });
}, 2);

function flashConsummer() {
    //获取数据库数据量，避免插入重复数据
    connection.query("SELECT MAX(id) AS offset from orders", function (errors, results, fields) {
        if (results[0].offset != null) {
            messageOffset = results[0];
        }
    });

    let consummer = new Consumer(
        kafkaClient,
        [
            {topic: 'FLASH_ORDER', partition: 0, offset: messageOffset}
        ],
        {
            autoCommit: false,
            fromOffset: true
        }
    );

    consummer.on('message', function (message) {
        if (message) {
            q.push(message);
        }
    });

    consummer.on("error", function (message) {
        console.log(message);
    });
};

exports.flashConsummer = flashConsummer;
