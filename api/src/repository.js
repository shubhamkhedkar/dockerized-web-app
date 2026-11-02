'use strict';

// Postgres-backed task repository. The API only talks to this interface,
// which keeps the HTTP layer testable without a real database.
function createPgRepository(pool) {
  return {
    async ping() {
      await pool.query('SELECT 1');
    },
    async list() {
      const { rows } = await pool.query(
        'SELECT id, title, done, created_at FROM tasks ORDER BY created_at DESC, id DESC'
      );
      return rows;
    },
    async create(title) {
      const { rows } = await pool.query(
        'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at',
        [title]
      );
      return rows[0];
    },
    async update(id, done) {
      const { rows } = await pool.query(
        'UPDATE tasks SET done = $2 WHERE id = $1 RETURNING id, title, done, created_at',
        [id, done]
      );
      return rows[0] || null;
    },
    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

// In-memory implementation used by the test suite.
function createMemoryRepository() {
  let nextId = 1;
  const tasks = new Map();
  return {
    healthy: true,
    async ping() {
      if (!this.healthy) throw new Error('database unavailable');
    },
    async list() {
      return [...tasks.values()].sort((a, b) => b.id - a.id);
    },
    async create(title) {
      const task = { id: nextId++, title, done: false, created_at: new Date().toISOString() };
      tasks.set(task.id, task);
      return task;
    },
    async update(id, done) {
      const task = tasks.get(id);
      if (!task) return null;
      task.done = done;
      return task;
    },
    async remove(id) {
      return tasks.delete(id);
    },
  };
}

module.exports = { createPgRepository, createMemoryRepository };
