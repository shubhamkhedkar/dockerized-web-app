'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createMemoryRepository } = require('../src/repository');
const { loadConfig } = require('../src/config');

const silentLogger = { error() {}, log() {} };
let server;
let base;
let repo;

beforeEach(async () => {
  repo = createMemoryRepository();
  const app = createApp({ repo, logger: silentLogger });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => new Promise((resolve) => server.close(resolve)));

const json = (method, body) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('GET /healthz returns ok', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /readyz returns 200 when the database is reachable', async () => {
  const res = await fetch(`${base}/readyz`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).database, 'up');
});

test('GET /readyz returns 503 when the database is down', async () => {
  repo.healthy = false;
  const res = await fetch(`${base}/readyz`);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).database, 'down');
});

test('GET /api/info reports the app name', async () => {
  const res = await fetch(`${base}/api/info`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).app, 'Taskboard');
});

test('task lifecycle: create, list, complete, delete', async () => {
  let res = await fetch(`${base}/api/tasks`, json('POST', { title: '  Write Dockerfile  ' }));
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.title, 'Write Dockerfile');
  assert.equal(created.done, false);

  res = await fetch(`${base}/api/tasks`);
  assert.equal((await res.json()).length, 1);

  res = await fetch(`${base}/api/tasks/${created.id}`, json('PATCH', { done: true }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).done, true);

  res = await fetch(`${base}/api/tasks/${created.id}`, { method: 'DELETE' });
  assert.equal(res.status, 204);

  res = await fetch(`${base}/api/tasks`);
  assert.deepEqual(await res.json(), []);
});

test('POST /api/tasks rejects a missing or blank title', async () => {
  for (const body of [{}, { title: '   ' }, { title: 42 }]) {
    const res = await fetch(`${base}/api/tasks`, json('POST', body));
    assert.equal(res.status, 400);
  }
});

test('POST /api/tasks rejects an over-long title', async () => {
  const res = await fetch(`${base}/api/tasks`, json('POST', { title: 'x'.repeat(201) }));
  assert.equal(res.status, 400);
});

test('POST /api/tasks rejects malformed JSON', async () => {
  const res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
});

test('PATCH validates id and body', async () => {
  assert.equal((await fetch(`${base}/api/tasks/abc`, json('PATCH', { done: true }))).status, 400);
  assert.equal((await fetch(`${base}/api/tasks/1`, json('PATCH', { done: 'yes' }))).status, 400);
  assert.equal((await fetch(`${base}/api/tasks/999`, json('PATCH', { done: true }))).status, 404);
});

test('DELETE returns 404 for an unknown task', async () => {
  assert.equal((await fetch(`${base}/api/tasks/999`, { method: 'DELETE' })).status, 404);
});

test('unknown routes return JSON 404', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'not found');
});

test('loadConfig reads env vars and fails fast on missing values', () => {
  const env = {
    POSTGRES_HOST: 'db',
    POSTGRES_DB: 'taskboard',
    POSTGRES_USER: 'taskboard',
    POSTGRES_PASSWORD: 'secret',
    API_PORT: '4000',
  };
  const config = loadConfig(env);
  assert.equal(config.port, 4000);
  assert.equal(config.db.host, 'db');
  assert.equal(config.db.port, 5432);
  assert.throws(() => loadConfig({ ...env, POSTGRES_PASSWORD: '' }), /POSTGRES_PASSWORD/);
});
