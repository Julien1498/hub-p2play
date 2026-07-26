import path from "path"
import { defineConfig, type Plugin } from "vite"

import react from "@vitejs/plugin-react"

function githubProxyPlugin(): Plugin {
  const handler = async (req: any, res: any) => {
    try {
      const reqUrl = new URL(req.url!, `http://${req.headers.host || 'localhost'}`);
      if (!reqUrl.pathname.startsWith('/api/github-proxy')) return false;

      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.statusCode = 204;
        res.end();
        return true;
      }

      const urlParam = reqUrl.searchParams.get('url');
      if (!urlParam) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing url parameter' }));
        return true;
      }

      const targetUrl = decodeURIComponent(urlParam);
      const acceptHeader = req.headers['accept'] || 'application/octet-stream';

      const headers: Record<string, string> = {
        'User-Agent': 'P2Play-Hub-App',
        'Accept': acceptHeader,
      };

      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow'
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      res.statusCode = response.status;
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
      return true;
    } catch (err: any) {
      console.error('[github-proxy] Error:', err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message || 'Proxy error' }));
      return true;
    }
  };

  return {
    name: 'github-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handler(req, res);
        if (!handled) next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handler(req, res);
        if (!handled) next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), githubProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

