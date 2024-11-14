const kafka = require("kafka-node");
const createKafkaClient = require("./kafkaclient");

function createKafkaConsumer(topic) {
  const client = createKafkaClient();
  const consumer = new kafka.Consumer(
    client,
    [{ topic: topic, partition: 0 }],
    { autoCommit: true }
  );

  consumer.on("message", (message) => {
    console.log("Message received from Kafka:", message);
  });

  consumer.on("error", (err) => {
    console.error("Kafka Consumer error:", err);
  });

  return consumer;
}

module.exports = createKafkaConsumer;
