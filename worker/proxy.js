/* ============================================================
 * Radar de Prospectos: sirve prospectos.mbc-latam.com
 *
 * Por que un Worker y no el dominio propio de GitHub Pages: con un CNAME en
 * Pages, la direccion github.io pasa a redirigir al subdominio. Como el filtro
 * de la red Indra bloquea *.mbc-latam.com, el radar dejaria de abrir en la
 * oficina. Asi, el subdominio y github.io sirven la MISMA pagina: este Worker
 * la toma de GitHub Pages en cada visita. Un solo lugar que editar
 * (docs/index.html) y dos accesos.
 *
 * No guarda datos ni claves. La clave de Anthropic vive en el Worker
 * processiq-api, al que la pagina llama directamente.
 * ============================================================ */

const ORIGEN = 'https://nelson2206.github.io/radar-prospectos';

export default {
  async fetch(req) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return new Response('Metodo no permitido', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const url = new URL(req.url);
    const destino = ORIGEN + (url.pathname === '/' ? '/' : url.pathname) + url.search;

    let r;
    try {
      r = await fetch(destino, { method: req.method, redirect: 'follow', cf: { cacheTtl: 60 } });
    } catch (e) {
      return new Response('No se pudo cargar la pagina. Prueba con https://nelson2206.github.io/radar-prospectos/', {
        status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }

    const cabeceras = new Headers(r.headers);
    // Cabeceras propias de GitHub que no aplican a este dominio.
    ['x-github-request-id', 'x-fastly-request-id', 'x-served-by', 'x-cache', 'x-cache-hits', 'x-timer', 'via']
      .forEach((h) => cabeceras.delete(h));
    cabeceras.set('x-content-type-options', 'nosniff');
    cabeceras.set('referrer-policy', 'strict-origin-when-cross-origin');

    return new Response(r.body, { status: r.status, headers: cabeceras });
  }
};
