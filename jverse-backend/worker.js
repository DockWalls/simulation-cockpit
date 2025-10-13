require('dotenv').config();
const { Worker, queue, defaultJobOptions, QUEUE_NAME } = require('./jobs/queue');
const meshFromPng = require('./jobs/processors/meshFromPng');

const processors = {
  'meshFromPng': meshFromPng,
};

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const fn = processors[job.name];
    if (!fn) throw new Error(`No processor for job: ${job.name}`);
    return await fn(job);
  },
  { connection: require('./jobs/queue').connection }
);

worker.on('completed', (job, result) => {
  console.log(`[worker] Completed ${job.id}`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Failed ${job?.id}:`, err?.message);
});

console.log('Worker started for queue:', QUEUE_NAME);
