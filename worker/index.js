/**
 * Cloudflare Worker – proxy com cache para os candles do Yahoo Finance.
 * Por que existe: o Yahoo não libera CORS para o navegador, e um proxy público
 * pode cair ou exigir chave. Este Worker é seu, gratuito e guarda a resposta
 * por 30 s: a turma toda gera só 1–2 chamadas por minuto ao Yahoo.
 *
 * Uso: GET https://SEU-WORKER/?symbol=USDBRL=X&interval=5m&range=1d
 * Toda resposta (inclusive de erro) leva o cabeçalho CORS, para o navegador conseguir ler.
 */
const SIMBOLOS = ['USDBRL=X', '^BVSP'];      // lista permitida (evita uso indevido)
const INTERVALOS = ['1m', '5m', '15m'];
const PERIODOS = ['1d', '5d'];
const CACHE_SEGUNDOS = 30;
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']; // tenta o segundo se o primeiro falhar
const CORS = { 'Access-Control-Allow-Origin': '*' };

async function buscarYahoo(symbol, interval, range) {
  let ultima;
  for (const host of HOSTS) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
    if (r.ok) return r;
    ultima = r;
  }
  return ultima;
}

export default {
  async fetch(req, env, ctx) {
    try {
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } });
      }

      const url = new URL(req.url);
      const symbol = url.searchParams.get('symbol');
      const interval = url.searchParams.get('interval') || '5m';
      const range = url.searchParams.get('range') || '1d';
      if (!SIMBOLOS.includes(symbol) || !INTERVALOS.includes(interval) || !PERIODOS.includes(range)) {
        return new Response('Parâmetros inválidos', { status: 400, headers: CORS });
      }

      const cache = caches.default;
      const chave = new Request(url.toString());
      let resposta = await cache.match(chave);

      if (!resposta) {
        const up = await buscarYahoo(symbol, interval, range);
        const corpo = await up.text();
        resposta = new Response(corpo, {
          status: up.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${up.ok ? CACHE_SEGUNDOS : 0}` },
        });
        if (up.ok) ctx.waitUntil(cache.put(chave, resposta.clone())); // só guarda respostas boas
      }

      const saida = new Response(resposta.body, resposta);
      saida.headers.set('Access-Control-Allow-Origin', '*');
      return saida;
    } catch (e) {
      // Qualquer exceção vira JSON com CORS (sem isso o navegador mostra só "falha de rede").
      return new Response(JSON.stringify({ erro: String(e) }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  },
};
