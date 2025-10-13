const { Queue, Worker, QueueEvents, JobsOptions } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const QUEUE_NAME = 'avatar-autogen';

const queue = new Queue(QUEUE_NAME, { connection });
const events = new QueueEvents(QUEUE_NAME, { connection });

function defaultJobOptions(overrides = {}) {
  /** @type {JobsOptions} */
  const base = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s, ...
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: { age: 24 * 3600, count: 5000 },
  };
  return { ...base, ...overrides };
}

module.exports = {
  connection,
  queue,
  events,
  QUEUE_NAME,
  defaultJobOptions,
  Worker,
};
