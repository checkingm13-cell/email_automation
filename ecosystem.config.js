module.exports = {
  apps: [
    {
      name: 'email-app',
      script: 'xvfb-run',
      args: '-a -s "-screen 0 1280x720x24" node server.js',
      interpreter: 'none',
      max_memory_restart: '500M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'email-tunnel',
      script: 'cloudflared',
      args: 'tunnel --url http://localhost:3000',
      interpreter: 'none',
      max_memory_restart: '100M',
      restart_delay: 10000
    }
  ]
};
