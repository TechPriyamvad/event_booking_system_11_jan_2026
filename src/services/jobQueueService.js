const { Queue } = require('bullmq');
const Redis = require('ioredis');

let redis = null;
let bookingQueue = null;
let eventQueue = null;

const initJobQueues = async () => {
  try {
    // For development, we'll use an in-memory simulation if Redis is not available
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redis.on('error', (err) => {
      console.log('Redis connection error, using in-memory job queue:', err.message);
      redis = null;
    });

    if (redis) {
      bookingQueue = new Queue('booking-confirmation', { connection: redis });
      eventQueue = new Queue('event-notification', { connection: redis });
    }

    return { bookingQueue, eventQueue };
  } catch (error) {
    console.log('Error initializing job queues:', error.message);
    // Fallback to in-memory queues
    return { bookingQueue, eventQueue };
  }
};

// In-memory job storage for when Redis is unavailable
const inMemoryJobs = {
  'booking-confirmation': [],
  'event-notification': [],
};

const addJob = async (jobType, jobData) => {
  try {
    if (jobType === 'booking-confirmation' && bookingQueue) {
      await bookingQueue.add('send-confirmation', jobData);
    } else if (jobType === 'event-notification' && eventQueue) {
      await eventQueue.add('send-notification', jobData);
    } else {
      // Fallback to in-memory storage
      inMemoryJobs[jobType] = inMemoryJobs[jobType] || [];
      inMemoryJobs[jobType].push(jobData);
      console.log(`[IN-MEMORY JOB ADDED] ${jobType}:`, jobData);
    }
  } catch (error) {
    console.error('Error adding job:', error);
    // Fallback to in-memory
    inMemoryJobs[jobType] = inMemoryJobs[jobType] || [];
    inMemoryJobs[jobType].push(jobData);
  }
};

const getInMemoryJobs = (jobType) => {
  return inMemoryJobs[jobType] || [];
};

module.exports = {
  initJobQueues,
  jobQueue: { addJob },
  getInMemoryJobs,
};
