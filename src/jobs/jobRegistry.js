// Job registry backed by Redis (Upstash) if configured, otherwise in-memory fallback for local dev.
let store;
const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
if (hasRedis) {
  try {
    store = require('./redisJobStore');
  } catch (e) {
    console.warn('WARNING: Redis store not available, falling back to in-memory:', e.message);
  }
}

if (!store) {
  const { randomUUID } = require('crypto');
  const jobs = new Map();

  store = {
    async createJob(meta = {}) {
      const id = randomUUID();
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
      jobs.set(id, job);
      return job;
    },
    async appendLog(id, chunk) {
      const job = jobs.get(id);
      if (!job) return;
      job.log += chunk;
      job.updatedAt = Date.now();
      const matches = job.log.match(/Saving PDF ->/g);
      job.counters.invoices = matches ? matches.length : 0;
    },
    async setStatus(id, status, error = null) {
      const job = jobs.get(id);
      if (!job) return;
      job.status = status;
      job.error = error;
      job.updatedAt = Date.now();
    },
    async getJob(id) {
      return jobs.get(id) || null;
    },
    async listJobs() {
      return Array.from(jobs.values()).map(j => ({
        id: j.id,
        status: j.status,
        invoices: j.counters.invoices,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        meta: j.meta,
        error: j.error,
      }));
    },
  };
}

module.exports = store;