import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'synthetic-pet-api',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const match = /^\/api\/pets\/(\d+)$/.exec(
            (request.url ?? '').split('?')[0],
          );
          if (!match) return next();
          const id = Number(match[1]);
          setTimeout(() => {
            response.statusCode = id === 500 ? 500 : 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ id, name: `Pet ${id}` }));
          }, 300);
        });
      },
    },
  ],
});
