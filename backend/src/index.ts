import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🚀 Server is running on port ${PORT}           ║
║                                              ║
║   📝 API Endpoints:                          ║
║   - GET  /api/v1/health                      ║
║   - POST /api/v1/auth/social/:provider       ║
║   - POST /api/v1/auth/refresh                ║
║   - GET  /api/v1/assets                      ║
║   - GET  /api/v1/assets/:uid                 ║
║   - GET  /api/v1/references/assets           ║
║   - GET  /api/v1/users/me                    ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});
