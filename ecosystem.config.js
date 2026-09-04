module.exports = {
  apps: [
    {
      name: 'email-app',
      script: 'xvfb-run',
      args: '-a -s "-screen 0 1920x1080x24" node server.js',
      interpreter: 'none',
      max_memory_restart: '1G',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'email-tunnel',
      script: 'cloudflared',
      args: 'tunnel --url http://localhost:3000',
      interpreter: 'none'
    }
  ]
};
