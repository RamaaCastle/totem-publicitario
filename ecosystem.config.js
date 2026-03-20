const path = require('path');

module.exports = {
  apps: [
    {
      name: 'signage-backend',
      script: path.join(__dirname, 'backend/main.js'),
      cwd: path.join(__dirname, 'backend'),
      env_production: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: path.join(__dirname, 'logs/backend-error.log'),
      out_file: path.join(__dirname, 'logs/backend-out.log'),
    },
  ],
};
