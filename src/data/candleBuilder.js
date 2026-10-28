/**
 * Gera uma série sintética (passeio aleatório) para o modo Replay quando ainda
 * não existe nenhuma série real guardada. Determinística: todos os alunos veem o mesmo gráfico.
 * Os preços NÃO são reais — a interface avisa isso.
 */
export function gerarSerieSintetica(ativo, tf, n = 240) {
  let semente = ativo.id.length * 9973 + tf;
  const aleatorio = () => { // gerador mulberry32
    semente |= 0; semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const passo = tf * 60;
  const inicio = Math.floor(Date.now() / 1000 / passo) * passo - n * passo;
  const vol = ativo.base * 0.0007 * Math.sqrt(tf);
  let precoAtual = ativo.base;

  return Array.from({ length: n }, (_, i) => {
    const open = precoAtual;
    const close = open + (aleatorio() - 0.5) * 2 * vol;
    const high = Math.max(open, close) + aleatorio() * vol * 0.5;
    const low = Math.min(open, close) - aleatorio() * vol * 0.5;
    precoAtual = close;
    return { time: inicio + i * passo, open, high, low, close };
  });
}
