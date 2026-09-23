import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createServer, defineConfig, type Plugin } from 'vite';

/**
 * Pages are rendered to HTML on the server side, by `src/render.ts`.
 *
 *   dev    a middleware renders each page request on the fly, through Vite's
 *          own module graph, so an edit to a page or its data shows on reload
 *   build  after the bundle is written, every route is rendered into the built
 *          index.html and saved as `<route>/index.html`, plus `404.html` and a
 *          sitemap
 *
 * The template's two markers, `<!--ssr-head-->` and `<!--ssr-body-->`, are
 * where the per-page title and meta and the page's markup go.
 */

const RENDER = '/src/render.ts';

interface Rendered {
  status: number;
  head: string;
  body: string;
}
interface RenderModule {
  render(pathname: string): Rendered;
  pages(): { file: string; html: Rendered }[];
  sitemapPaths(): string[];
}

const fill = (template: string, r: Rendered): string => {
  if (!template.includes('<!--ssr-head-->') || !template.includes('<!--ssr-body-->')) {
    throw new Error('index.html is missing its <!--ssr-head--> / <!--ssr-body--> markers');
  }
  return template.replace('<!--ssr-head-->', r.head).replace('<!--ssr-body-->', r.body);
};

function prerender(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  let building = false;

  return {
    name: 'ps:prerender',

    configResolved(c) {
      root = c.root;
      outDir = resolve(c.root, c.build.outDir);
      building = c.command === 'build';
    },

    configureServer(server) {
      // Registered directly, so it runs before Vite's own HTML fallback.
      server.middlewares.use(async (req, res, next) => {
        const accept = req.headers.accept ?? '';
        if (req.method !== 'GET' || !accept.includes('text/html')) return next();
        const url = new URL(req.url ?? '/', 'http://localhost');
        // Files (anything with an extension) belong to Vite and public/.
        if (/\.[a-z0-9]+$/i.test(url.pathname)) return next();
        try {
          const mod = (await server.ssrLoadModule(RENDER)) as RenderModule;
          const r = mod.render(url.pathname);
          const template = await readFile(join(root, 'index.html'), 'utf8');
          const html = await server.transformIndexHtml(url.pathname, fill(template, r));
          res.statusCode = r.status;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (e) {
          server.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    },

    async closeBundle() {
      if (!building) return;
      // A throwaway dev server, only to load the TypeScript render module
      // through Vite. No config file, so this plugin does not load itself.
      const server = await createServer({
        root,
        configFile: false,
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false },
        optimizeDeps: { noDiscovery: true, include: [] },
      });
      try {
        const mod = (await server.ssrLoadModule(RENDER)) as RenderModule;
        const template = await readFile(join(outDir, 'index.html'), 'utf8');
        for (const { file, html } of mod.pages()) {
          const dest = join(outDir, file);
          await mkdir(dirname(dest), { recursive: true });
          await writeFile(dest, fill(template, html));
        }
        const urls = mod.sitemapPaths().map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
        await writeFile(
          join(outDir, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        );
      } finally {
        await server.close();
      }
    },
  };
}

export default defineConfig({
  // Absolute, because pages live at several depths (/about/, /product-designs/chellbook/)
  // and every one of them loads the same /assets/ bundle. The site is served
  // from the root of christopherfiore.net, so '/' is always right.
  base: '/',
  plugins: [prerender()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
