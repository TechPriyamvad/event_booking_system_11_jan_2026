const { Queue } = require('bullmq');

const connection = {
  host: 'localhost',
  port: 6379,
};

const bookingQueue = new Queue('booking-confirmation', { connection });
const notificationQueue = new Queue('event-update-notification', { connection });

module.exports = { bookingQueue, notificationQueue };
