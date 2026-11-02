'use strict';

const express = require('express');

const MAX_TITLE_LENGTH = 200;

function parseId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 && String(id) === raw ? id : null;
}

function createApp({ repo, appName = 'Taskboard', logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // Liveness: the process is up and serving HTTP.
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  // Readiness: the API can reach its database.
  app.get('/readyz', async (_req, res) => {
    try {
      await repo.ping();
      res.json({ status: 'ready', database: 'up' });
    } catch (err) {
      logger.error(`readiness check failed: ${err.message}`);
      res.status(503).json({ status: 'not-ready', database: 'down' });
    }
  });

  app.get('/api/info', (_req, res) => {
    res.json({ app: appName, version: process.env.APP_VERSION || '1.0.0', hostname: process.env.HOSTNAME || 'unknown' });
  });

  app.get('/api/tasks', async (_req, res, next) => {
    try {
      res.json(await repo.list());
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/tasks', async (req, res, next) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `title must be at most ${MAX_TITLE_LENGTH} characters` });
    }
    try {
      res.status(201).json(await repo.create(title));
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/tasks/:id', async (req, res, next) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'invalid id' });
    if (typeof req.body?.done !== 'boolean') return res.status(400).json({ error: 'done must be a boolean' });
    try {
      const task = await repo.update(id, req.body.done);
      if (!task) return res.status(404).json({ error: 'task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/tasks/:id', async (req, res, next) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'invalid id' });
    try {
      const removed = await repo.remove(id);
      if (!removed) return res.status(404).json({ error: 'task not found' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.use((_req, res) => res.status(404).json({ error: 'not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON body' });
    logger.error(err.stack || err.message);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
