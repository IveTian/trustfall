import { env } from 'cloudflare:workers';
import { api } from '@trustfall/api';
import { actions, i18n, middleware, pages } from 'astro/hono';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.route('/api', api);

app.get('/admin', (c) => c.redirect('/admin/'));
app.get('/admin/*', async (c) => {
  const res = await env.ASSETS.fetch(new Request(new URL('/admin/index.html', c.req.url)));
  return new Response(res.body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});

app.use(actions());
app.use(middleware());
app.use(pages());
app.use(i18n());

export default app;
