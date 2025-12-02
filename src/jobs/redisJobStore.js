const { Redis } = require('@upstash/redis');

// Expect env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const JOBS_KEY = 'aibot:jobs';

async function createJob(meta = {}) {
  const { v4: uuid } = require('uuid');
  const id = uuid();
  const job = {
    id,
    status: 'pending',
    log: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    meta,
    counters: { invoices: 0 },
    error: null,
  };
  await redis.hset(JOBS_KEY, { [id]: JSON.stringify(job) });
  return job;
}

async function appendLog(id, chunk) {
  const raw = await redis.hget(JOBS_KEY, id);
  if (!raw) return;
  const job = JSON.parse(raw);
  job.log += chunk;
  job.updatedAt = Date.now();
  const matches = job.log.match(/Saving PDF ->/g);
  job.counters.invoices = matches ? matches.length : 0;
  await redis.hset(JOBS_KEY, { [id]: JSON.stringify(job) });
}

async function setStatus(id, status, error = null) {
  const raw = await redis.hget(JOBS_KEY, id);
  if (!raw) return;
  const job = JSON.parse(raw);
  job.status = status;
  job.error = error;
  job.updatedAt = Date.now();
  await redis.hset(JOBS_KEY, { [id]: JSON.stringify(job) });
}

async function getJob(id) {
  const raw = await redis.hget(JOBS_KEY, id);
  return raw ? JSON.parse(raw) : null;
}

async function listJobs() {
  const all = await redis.hgetall(JOBS_KEY);
  const items = Object.values(all || {}).map(v => JSON.parse(v));
  return items.map(j => ({
    id: j.id,
    status: j.status,
    invoices: j.counters?.invoices || 0,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    meta: j.meta,
    error: j.error,
  }));
}

module.exports = { createJob, appendLog, setStatus, getJob, listJobs };
