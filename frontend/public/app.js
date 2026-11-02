'use strict';

const list = document.getElementById('tasks');
const empty = document.getElementById('empty');
const form = document.getElementById('task-form');
const input = document.getElementById('title');
const statusBadge = document.getElementById('status');

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function render(tasks) {
  list.replaceChildren();
  empty.hidden = tasks.length > 0;
  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = task.done ? 'done' : '';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () =>
      api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: checkbox.checked }) }).then(load)
    );

    const title = document.createElement('span');
    title.textContent = task.title; // textContent avoids HTML injection

    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => api(`/api/tasks/${task.id}`, { method: 'DELETE' }).then(load));

    li.append(checkbox, title, del);
    list.append(li);
  }
}

async function load() {
  try {
    render(await api('/api/tasks'));
  } catch (err) {
    console.error(err);
  }
}

async function checkHealth() {
  try {
    await api('/api/health');
    statusBadge.textContent = 'API + DB up';
    statusBadge.className = 'badge up';
  } catch {
    statusBadge.textContent = 'API or DB down';
    statusBadge.className = 'badge down';
  }
  api('/api/info')
    .then((info) => { document.getElementById('host').textContent = info.hostname; })
    .catch(() => {});
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) });
  input.value = '';
  load();
});

checkHealth();
load();
setInterval(checkHealth, 10000);
