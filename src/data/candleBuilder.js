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

/**
 * Forma um candle já conhecido ao longo de `duracaoMs`, para o Replay.
 * Caminho: abertura → primeiro extremo → segundo extremo → fechamento
 * (candle de alta passa antes pela mínima; o de baixa, antes pela máxima).
 *
 * Uso: const f = criarFormador(candle, duracaoMs);
 *      f.inicial()        → candle recém-aberto (só o preço de abertura)
 *      f.avancar(deltaMs) → { candle, fim } após passar deltaMs; em `fim` o candle é idêntico ao original.
 */
export function criarFormador(c, duracaoMs) {
  const sobe = c.close >= c.open;
  const pontos = [c.open, sobe ? c.low : c.high, sobe ? c.high : c.low, c.close];
  const amp = c.high - c.low;
  let decorrido = 0;
  let fAnterior = 0;
  let high = c.open;
  let low = c.open;

  return {
    inicial: () => ({ time: c.time, open: c.open, high: c.open, low: c.open, close: c.open }),

    avancar(deltaMs) {
      decorrido = Math.min(duracaoMs, decorrido + deltaMs);
      const f = decorrido / duracaoMs;
      if (f >= 1) return { candle: { ...c }, fim: true };

      const trecho = Math.min(2, Math.floor(f * 3));
      const g = f * 3 - trecho;
      let p = pontos[trecho] + (pontos[trecho + 1] - pontos[trecho]) * g;

      if (fAnterior < 1 / 3 && f >= 1 / 3) p = pontos[1];        // passou pelo 1º extremo: pousa nele
      else if (fAnterior < 2 / 3 && f >= 2 / 3) p = pontos[2];   // passou pelo 2º extremo
      else p += (Math.random() - 0.5) * amp * 0.2;               // oscilação entre os extremos
      p = Math.min(c.high, Math.max(c.low, p));

      fAnterior = f;
      high = Math.max(high, p);
      low = Math.min(low, p);
      return { candle: { time: c.time, open: c.open, high, low, close: p }, fim: false };
    },
  };
}
