var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    kafkaClient = new kafka.KafkaClient({kafkaHost: '81.70.204.243:9092'});

var async = require('async');

var mysql = require('mysql'),
    mysqlPool = mysql.createPool({
        host: '81.70.204.243',
        user: 'root',
        password: '123456',
        database: 'flash_sale'
    });

const redis = require("redis");
const redisClient = redis.createClient(6379, "81.70.204.243");

redisClient.on("ready", function (err, reply) {
    //ready的时候查询缓存的库存值，没有对应的key或者值小于等于0，则初始化一个值
    redisClient.get("inStock", function (err, res) {
        if (res === null || res <= 0) {
            redisClient.set("inStock", inStock, function (err, res) {
                if (err) throw err;
                //断开redis连接
                redisClient.end(true);
                console.log("初始化库存值成功！库存为： "+ inStock);
            });
        }
    });
});

//货物库存量
const inStock = 2000

var messageOffset = 0;

//定义一个队列保存数据，kafka consumer 收到数据后,将对应的数据插入mysql数据库
var q = async.queue(function (message, callback) {
    let orderInfo = JSON.parse(message.value);
    mysqlPool.getConnection(function (err, conn){
        if (err) console.error(err);
        else {
            conn.query("INSERT INTO orders SET ?", {
                user_id: orderInfo.user_id,
                address_id: orderInfo.address_id,
                product_name: orderInfo.product_name,
                product_price: orderInfo.product_price,
                status: orderInfo.status
            }, function (error, results, fields) {
                conn.release();
                if (error) {
                    throw error;
                }
                callback();
            });
        }
    });
}, 2);

//mysql最大重连次数
let mysql_max_retry_times = 5

//mysql重连操作，为了避免程序先启动而mysql容器还没有运行起来连接失败的情况
function handleMysqlDisconnect() {
    mysqlPool.getConnection(function (err, conn) {
      //如果连接出错，进行重连
      if (err && mysql_max_retry_times) {
          console.log("error when connecting to mysql: "+ err);
          setTimeout(handleMysqlDisconnect, 5000);
          mysql_max_retry_times -= 1;
      } else if (err && mysql_max_retry_times < 0) {
          console.log("have try reconnect for 3 times, program exit");
          process.exit(0);
      } else {
          console.log("连接mysql数据库成功！");
          //获取数据库已存入的数据量，避免获取重复数据
          conn.query("SELECT MAX(id) AS offset from orders", function (errors, results, fields) {
              conn.release();
              if (errors) throw errors;
              else {
                  console.log("查询数据库,成功初始化kafka消息offset");
                  if (results[0].offset != null) {
                      messageOffset = results[0];
                  }
              }
          });
          return;
      }
    });
};

function flashConsumer() {
    //查询数据库，初始化kafka message offset
    handleMysqlDisconnect();

    let consumer = new Consumer(
        kafkaClient,
        [
            {topic: 'flash-order', partition: 0, offset: messageOffset}
        ],
        {
            autoCommit: false,
            fromOffset: true
        }
    );

    consumer.on('error', function (err) {
        // 如果是topic未创建报错，先创建主题(理论上在docker-compose中有设置自动创建topic)
        if (err.toString().split(":")[0] === "TopicsNotExistError") {
            kafkaClient.createTopics([{
                topic: 'flash-order',
                partitions: 1,
                replicationFactor: 1
            }], (error, result) => {
                if (error) console.error("创建主题失败！");
            })
        };
    })

    consumer.on('message', function (message) {
        if (message.value) {
            q.push(message);
        }
    });
};


process.on("exit", (code) => {
    console.log("exit");
    //程序终止，关闭redis以及mysql连接
    mysqlPool.end();
    redisClient.end(true);
});

process.on("SIGINT", (code) => {
    console.log("process interrupted by manual");
    process.exit(0);
});

process.on("SIGTERM", (code) => {
    // exit on linux
    process.exit(0);
});

exports.flashConsumer = flashConsumer;
