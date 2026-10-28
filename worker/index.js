/**
 * Cloudflare Worker – proxy com cache para os candles do Yahoo Finance.
 * Por que existe: o Yahoo não libera CORS para o navegador, e um proxy público
 * pode cair ou exigir chave. Este Worker é seu, gratuito e guarda a resposta
 * por 30 s: a turma toda gera só 1–2 chamadas por minuto ao Yahoo.
 *
 * Uso: GET https://SEU-WORKER/?symbol=USDBRL=X&interval=5m&range=1d
 */
const SIMBOLOS = ['USDBRL=X', '^BVSP'];      // lista permitida (evita uso indevido)
const INTERVALOS = ['1m', '5m', '15m'];
const PERIODOS = ['1d', '5d'];
const CACHE_SEGUNDOS = 30;

export default {
  async fetch(req, env, ctx) {
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    }

    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    const interval = url.searchParams.get('interval') || '5m';
    const range = url.searchParams.get('range') || '1d';
    if (!SIMBOLOS.includes(symbol) || !INTERVALOS.includes(interval) || !PERIODOS.includes(range)) {
      return new Response('Parâmetros inválidos', { status: 400, headers: cors });
    }

    const cache = caches.default;
    const chave = new Request(url.toString());
    let resposta = await cache.match(chave);

    if (!resposta) {
      const origem = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
      const up = await fetch(origem, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      resposta = new Response(up.body, {
        status: up.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SEGUNDOS}` },
      });
      if (up.ok) ctx.waitUntil(cache.put(chave, resposta.clone()));
    }

    const saida = new Response(resposta.body, resposta);
    saida.headers.set('Access-Control-Allow-Origin', '*');
    return saida;
  },
};
