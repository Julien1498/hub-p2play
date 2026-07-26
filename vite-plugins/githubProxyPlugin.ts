import type { Plugin } from "vite";
import { isAllowedGithubUrl } from "./isAllowedGithubUrl.ts";

/**
 * Dev/preview middleware: allowlisted reverse proxy for GitHub API + release assets.
 * Rejects any non-GitHub URL (SSRF protection).
 */
export function githubProxyPlugin(): Plugin {
  const handler = async (req: { url?: string; method?: string; headers: Record<string, string | string[] | undefined> }, res: {
    setHeader: (k: string, v: string) => void;
    statusCode: number;
    end: (body?: string | Buffer) => void;
  }): Promise<boolean> => {
    try {
      const reqUrl = new URL(req.url!, `http://${req.headers.host || "localhost"}`);
      if (!reqUrl.pathname.startsWith("/api/github-proxy")) return false;

      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Accept");
        res.statusCode = 204;
        res.end();
        return true;
      }

      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return true;
      }

      const urlParam = reqUrl.searchParams.get("url");
      if (!urlParam) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing url parameter" }));
        return true;
      }

      let targetUrl: string;
      try {
        targetUrl = decodeURIComponent(urlParam);
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid url parameter" }));
        return true;
      }

      if (!isAllowedGithubUrl(targetUrl)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "URL host not allowlisted (GitHub only)" }));
        return true;
      }

      const acceptHeader =
        (typeof req.headers.accept === "string" && req.headers.accept) ||
        "application/octet-stream";

      const headers: Record<string, string> = {
        "User-Agent": "P2Play-Hub-App",
        Accept: acceptHeader,
      };

      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(targetUrl, {
        headers,
        redirect: "follow",
      });

      // Re-check final URL after redirects stay on allowlisted hosts.
      if (response.url && !isAllowedGithubUrl(response.url)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "Redirect target not allowlisted" }));
        return true;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Cache-Control", "no-store");

      res.statusCode = response.status;
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);

      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
      return true;
    } catch (err: unknown) {
      console.error("[github-proxy] Error:", err);
      res.statusCode = 500;
      const message = err instanceof Error ? err.message : "Proxy error";
      res.end(JSON.stringify({ error: message }));
      return true;
    }
  };

  return {
    name: "github-proxy-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handler(req as never, res as never);
        if (!handled) next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handler(req as never, res as never);
        if (!handled) next();
      });
    },
  };
}
