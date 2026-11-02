'use strict';

// All runtime configuration comes from environment variables (12-factor).
function required(name, env) {
  const value = env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig(env = process.env) {
  return {
    port: Number.parseInt(env.API_PORT || '3000', 10),
    logLevel: env.LOG_LEVEL || 'info',
    appName: env.APP_NAME || 'Taskboard',
    db: {
      host: required('POSTGRES_HOST', env),
      port: Number.parseInt(env.POSTGRES_PORT || '5432', 10),
      database: required('POSTGRES_DB', env),
      user: required('POSTGRES_USER', env),
      password: required('POSTGRES_PASSWORD', env),
      max: Number.parseInt(env.DB_POOL_MAX || '10', 10),
    },
  };
}

module.exports = { loadConfig };
