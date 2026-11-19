const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.port, () => {
  console.log('======================================================');
  console.log('Sistem Inventaris Olahraga Sekolah v1.1 (Unified MVC)');
  console.log(`Server aktif pada : http://localhost:${env.port}`);
  console.log(`Environment       : ${env.nodeEnv}`);
  console.log('======================================================');
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
  server.close(() => {
    process.exit(1);
  });
});