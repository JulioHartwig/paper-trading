import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts';

const VERDE = '#0f9d6b';
const VERMELHO = '#d6453d';

/** Gráfico de candles + uma linha horizontal para cada posição aberta do ativo. */
export default function ChartPanel({ candles, posicoes, ativoId, casas }) {
  const caixa = useRef(null);
  const grafico = useRef(null);
  const serie = useRef(null);
  const linhas = useRef([]);
  const tinhaDados = useRef(false);

  // Cria o gráfico uma única vez.
  useEffect(() => {
    const chart = createChart(caixa.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#334155', fontFamily: 'IBM Plex Sans, system-ui, sans-serif' },
      grid: { vertLines: { color: '#eef1f5' }, horzLines: { color: '#eef1f5' } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    serie.current = chart.addSeries(CandlestickSeries, {
      upColor: VERDE, downColor: VERMELHO, borderVisible: false, wickUpColor: VERDE, wickDownColor: VERMELHO,
    });
    grafico.current = chart;
    return () => { chart.remove(); linhas.current = []; tinhaDados.current = false; };
  }, []);

  // Casas decimais do eixo de preços e das etiquetas (dólar 3, Ibovespa 0).
  useEffect(() => {
    serie.current.applyOptions({ priceFormat: { type: 'price', precision: casas, minMove: 1 / 10 ** casas } });
  }, [casas]);

  // Atualiza os candles; ajusta o zoom só na primeira carga de cada ativo/timeframe.
  useEffect(() => {
    serie.current.setData(candles);
    if (candles.length && !tinhaDados.current) { grafico.current.timeScale().fitContent(); tinhaDados.current = true; }
    if (!candles.length) tinhaDados.current = false;
  }, [candles]);

  // Redesenha as linhas de preço de entrada.
  useEffect(() => {
    const s = serie.current;
    linhas.current.forEach((l) => s.removePriceLine(l));
    linhas.current = posicoes
      .filter((p) => p.ativoId === ativoId)
      .map((p) =>
        s.createPriceLine({
          price: p.precoEntrada,
          color: p.lado === 'compra' ? VERDE : VERMELHO,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${p.lado === 'compra' ? 'Compra' : 'Venda'} ${p.lotes}`,
        })
      );
  }, [posicoes, ativoId]);

  return <div ref={caixa} className="grafico" role="img" aria-label="Gráfico de candles" />;
}
