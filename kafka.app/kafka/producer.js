const kafka = require("kafka-node");
const createKafkaClient = require("./kafkaclient");

function sendMessageToKafka(topic, message) {
  const client = createKafkaClient();
  const producer = new kafka.Producer(client);

  producer.on("ready", () => {
    console.log("Kafka Producer is ready");

    const payloads = [
      {
        topic: topic, // موضوعی که پیام به آن ارسال می‌شود
        messages: JSON.stringify(message), // تبدیل پیام به فرمت JSON
        partition: 0,
      },
    ];

    producer.send(payloads, (err, data) => {
      if (err) {
        console.error("Failed to send message to Kafka:", err);
      } else {
        console.log("Message sent to Kafka:", data);
      }
    });
  });

  producer.on("error", (err) => {
    console.error("Kafka Producer error:", err);
  });
}

module.exports = sendMessageToKafka;
