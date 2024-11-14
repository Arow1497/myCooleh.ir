const kafka = require("kafka-node");

function createKafkaClient() {
  const client = new kafka.KafkaClient({
    kafkaHost: "localhost:9092", // آدرس Kafka Broker
  });
  return client;
}

module.exports = createKafkaClient;
