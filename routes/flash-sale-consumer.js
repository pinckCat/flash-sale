var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    kafkaClient = new kafka.KafkaClient({kafkaHost: '81.70.204.243:9092'}),
    kafkaAdmin = new kafka.Admin(kafkaClient);

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

//mysql最大重连次数
let mysql_max_retry_times = 5

//kafka创建topic失败重新创建最大次数
let topic_create_max_times = 5

//处理创建topic失败导致comsumer 订阅失败的情况
function handleTopicCreateFail() {
    //创建topic
    kafkaClient.createTopics([{
        topic: 'flash-order',
        partitions: 1,
        replicationFactor: 1
    }], (error, result) => {
        if (error && topic_create_max_times) {
            console.error("topic创建失败！尝试重新");
            setTimeout(handleTopicCreateFail, 5000);
            topic_create_max_times -= 1;
        } else if (error && topic_create_max_times < 0) {
            console.log("多次尝试创建topic失败，程序退出");
            throw error;
        }
        else {
            //初始化消费者
            let consumer = new Consumer(
                kafkaClient,
                [
                    {topic: 'flash-order', partition: 0, offset: messageOffset}
                ]);

            consumer.on('message', function (message) {
                //防止重复读取数据
                if (message.offset >= messageOffset) {
                    handleMysqlDisconnect('message', JSON.parse(message.value));
                }
            });
            console.log("topic创建成功！");
            return;
        }
    });
}

//mysql重连操作，为了避免程序先启动而mysql容器还没有运行起来导致数据库连接失败以及consumer接收信息插入数据连接数据库失败的情况
function handleMysqlDisconnect(type, orderInfo='') {
    mysqlPool.getConnection(function (err, conn) {
      //如果连接出错，进行重连
      if (err && mysql_max_retry_times) {
          console.log("error when connecting to mysql: "+ err);
          if (orderInfo === "message") setTimeout(handleMysqlDisconnect, 5000, "message", orderInfo);
          else setTimeout(handleMysqlDisconnect, 5000, "init");
          mysql_max_retry_times -= 1;
      } else if (err && mysql_max_retry_times < 0) {
          console.log("have try reconnect for 3 times, program exit");
          process.exit(0);
      } else {
          //程序启动初始化
          if (type === 'init') {
              console.log("连接mysql数据库成功！");
              //获取数据库已存入的数据量，避免获取重复数据
              conn.query("SELECT MAX(id) AS offset from orders", function (errors, results, fields) {
                  conn.release();
                  if (errors) throw errors;
                  else {
                      console.log("查询数据库,成功初始化kafka消息offset");
                      messageOffset = results[0].offset != null ? results[0].offset : 0;
                      kafkaAdmin.listTopics((err, res) => {
                          // 如果已经有主题则直接初始化消费者，没有则先创建topic
                          if (res[1].metadata.hasOwnProperty('flash-order')) {
                              console.log('已经有flash-order topic, 初始化consumer');
                              //初始化消费者
                              let consumer = new Consumer(
                                  kafkaClient,
                                  [
                                      {topic: 'flash-order', partition: 0, offset: results[0].offset != null ? results[0].offset : 0}
                                  ]);

                              consumer.on('message', function (message) {
                                  //防止重复读取数据
                                  if (message.offset >= messageOffset) {
                                      handleMysqlDisconnect('message', JSON.parse(message.value));
                                  }
                              });
                          } else {
                              //先创建topic再初始化consumer，需要处理创建topic失败的情况
                             handleTopicCreateFail();
                          }
                      });
                  }
                  return;
              });
          } else if (type === 'message') {    //订单数据入mysql
              // 将订单数据存入mysql数据库
              conn.query("INSERT INTO orders SET ?", {
                  user_id: orderInfo.user_id,
                  address_id: orderInfo.address_id,
                  product_name: orderInfo.product_name,
                  product_price: orderInfo.product_price,
                  status: orderInfo.status
              }, function (error, results, fields) {
                  conn.release();
                  if (error) throw error;
                  return;
              });
          }
      }
    });
}

function flashConsumer() {
    //查询数据库，初始化kafka message offset以及一些consumer的初始化
    handleMysqlDisconnect("init");
};

/*
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

 */

exports.flashConsumer = flashConsumer;
