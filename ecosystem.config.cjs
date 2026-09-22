// Configuración de PM2 en producción. El deploy la copia a cada release y ejecuta
// `pm2 startOrReload current/ecosystem.config.cjs`. Modo cluster (1 instancia) para que
// `reload` no deje la web sin servicio durante el cambio de release.
module.exports = {
  apps: [
    {
      name: 'gallardo-crowdfunding',
      cwd: '/var/www/gallardo-crowdfunding/current',
      script: 'server/entry.mjs',
      exec_mode: 'cluster',
      instances: 1,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '5025',
      },
    },
  ],
};
