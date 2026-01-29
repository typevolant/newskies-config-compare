import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Plugin to save snapshots to the history folder during development
function snapshotSaverPlugin(): Plugin {
  return {
    name: 'snapshot-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-snapshot', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { filename, data } = JSON.parse(body);

            if (!filename || !data) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing filename or data' }));
              return;
            }

            // Ensure filename is safe (only allow history/ paths)
            if (!filename.startsWith('history/') || filename.includes('..')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid filename' }));
              return;
            }

            const fullPath = path.join(process.cwd(), filename);
            const dir = path.dirname(fullPath);

            // Create directory if it doesn't exist
            await fs.promises.mkdir(dir, { recursive: true });

            // Write the file
            await fs.promises.writeFile(fullPath, JSON.stringify(data, null, 2));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, path: filename }));
          } catch (err) {
            console.error('Error saving snapshot:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), snapshotSaverPlugin()],
})
