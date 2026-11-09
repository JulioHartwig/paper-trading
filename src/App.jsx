import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ATIVOS, TIMEFRAMES, SALDO_INICIAL, ATRASO_ORDEM_MS, GARANTIA_POR_LOTE } from './config.js';
import { reducer, calcPL, verificarSaida } from './state/accountReducer.js';
import { carregarEstado, salvarEstado } from './state/storage.js';
import { useMercado } from './data/useMercado.js';
import { agregarCandles, MAX_VISIVEIS } from './data/mercado.js';
import { brl } from './lib/format.js';
import { arredondar } from './lib/preco.js';
import ChartPanel from './components/ChartPanel.jsx';
import OrderPanel from './components/OrderPanel.jsx';
import PositionsPanel from './components/PositionsPanel.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import StatusBanner from './components/StatusBanner.jsx';

export default function App() {
  const [conta, dispatch] = useReducer(reducer, null, carregarEstado);
  const [ativoId, setAtivoId] = useState(ATIVOS[0].id);
  const [tf, setTf] = useState(1); // 1 min: o candle leva 1 minuto real para se formar

  const ativo = ATIVOS.find((a) => a.id === ativoId);

  // Um único mercado simulado alimenta os dois ativos o tempo todo. O timeframe só muda a forma de
  // agrupar os mesmos preços, então o preço atual é o mesmo em qualquer timeframe.
  const mercado = useMercado();
  const candles = useMemo(
    () => (mercado ? agregarCandles(mercado[ativoId].fechados, mercado[ativoId].formando, tf).slice(-MAX_VISIVEIS) : []),
    [mercado, ativoId, tf]
  );
  // Preço atual de cada ativo, já na escala e no passo (ex.: 5.345,50): é o preço usado nas execuções.
  const precos = useMemo(
    () => (mercado ? Object.fromEntries(ATIVOS.map((a) => [a.id, arredondar(mercado[a.id].formando.close, a)])) : {}),
    [mercado]
  );
  const precoAtual = precos[ativoId] ?? null;

  // Persiste a conta a cada mudança.
  useEffect(() => salvarEstado(conta), [conta]);

  const plAberto = conta.posicoes.reduce((soma, p) => soma + calcPL(p, precos[p.ativoId] ?? p.precoEntrada), 0);
  const patrimonio = conta.saldo + plAberto;

  // Garantia: cada LOTE aberto bloqueia um valor fixo (2 lotes = 2 × garantia). O que sobra do patrimônio
  // é o disponível para novas ordens; a garantia volta quando a posição é encerrada.
  const lotesAbertos = conta.posicoes.reduce((soma, p) => soma + p.lotes, 0);
  const garantiaBloqueada = lotesAbertos * GARANTIA_POR_LOTE;
  const disponivel = patrimonio - garantiaBloqueada;
  const disponivelRef = useRef(0); // lido na hora da execução, pois o saldo pode mudar durante o atraso
  useEffect(() => { disponivelRef.current = disponivel; }, [disponivel]);
  const [aviso, setAviso] = useState('');

  // Preços mais recentes, lidos no momento em que a ordem é executada (não no clique).
  const precosRef = useRef({});
  useEffect(() => { precosRef.current = precos; }, [precos]);

  // Stop e alvo: a cada novo preço, encerra as posições (de qualquer ativo) que atingiram o nível.
  // O encerramento é imediato e ao preço vigente (pode ficar um pouco além do nível, como numa ordem a mercado).
  useEffect(() => {
    conta.posicoes.forEach((p) => {
      const preco = precos[p.ativoId];
      if (preco == null) return;
      const motivo = verificarSaida(p, preco);
      if (motivo) dispatch({ type: 'ENCERRAR', id: p.id, preco, hora: new Date().toISOString(), motivo });
    });
  }, [precos, conta.posicoes]);

  // Liquidação: se o patrimônio chegar a zero, todas as posições são encerradas aos preços vigentes.
  useEffect(() => {
    if (patrimonio > 0 || conta.posicoes.length === 0) return;
    if (!conta.posicoes.every((p) => precos[p.ativoId] != null)) return; // espera ter o preço de cada ativo
    dispatch({ type: 'LIQUIDAR', precos, hora: new Date().toISOString() });
    setAviso('Patrimônio zerado: todas as operações foram encerradas. Use "Resetar conta" para recomeçar.');
  }, [patrimonio, conta.posicoes, precos]);

  // Ordens em andamento: enquanto houver alguma, os botões de ordem ficam travados.
  const [pendentes, setPendentes] = useState(0);
  const ocupado = pendentes > 0;

  // Atraso entre o clique e a execução; `acao` recebe os preços vigentes na hora da execução.
  const comAtraso = (acao) => {
    setPendentes((n) => n + 1);
    setTimeout(() => {
      acao(precosRef.current);
      setPendentes((n) => n - 1);
    }, ATRASO_ORDEM_MS);
  };

  // stop/alvo chegam como distâncias (ou null); viram níveis de preço a partir do preço de execução.
  const abrir = (lado, lotes, { stop, alvo }) => {
    setAviso('');
    comAtraso((precosAgora) => {
      const preco = precosAgora[ativoId];
      if (preco == null) return;
      if (disponivelRef.current < lotes * GARANTIA_POR_LOTE) {
        setAviso('Ordem recusada: garantia insuficiente.'); // o saldo mudou durante o atraso
        return;
      }
      const direcao = lado === 'compra' ? 1 : -1;
      const nivel = (distancia, sinal) =>
        distancia == null ? null : arredondar(preco + sinal * direcao * distancia, ativo);
      dispatch({
        type: 'ABRIR',
        ordem: {
          ativoId, lado, lotes, precoEntrada: preco, hora: new Date().toISOString(),
          stopPreco: nivel(stop, -1), // compra: abaixo da entrada; venda: acima
          alvoPreco: nivel(alvo, +1), // compra: acima da entrada; venda: abaixo
        },
      });
    });
  };
  const encerrar = (id) => {
    const pos = conta.posicoes.find((p) => p.id === id);
    if (!pos) return;
    comAtraso((precosAgora) => {
      const preco = precosAgora[pos.ativoId]; // preço do ativo da posição, esteja ele na tela ou não
      if (preco != null) dispatch({ type: 'ENCERRAR', id, preco, hora: new Date().toISOString() });
    });
  };
  const ajustarNiveis = (id, stopPreco, alvoPreco) => dispatch({ type: 'AJUSTAR_NIVEIS', id, stopPreco, alvoPreco });
  const resetar = () => {
    if (window.confirm('Voltar ao saldo inicial e apagar posições e histórico?')) dispatch({ type: 'RESETAR' });
  };

  return (
    <div className="app">
      <header className="topo">
        <h1>Simulador de Negociações</h1>
        <div className="resumo">
          <div><span>Saldo</span><strong>{brl(conta.saldo)}</strong></div>
          <div><span>Resultado em aberto</span><strong className={plAberto >= 0 ? 'ganho' : 'perda'}>{brl(plAberto)}</strong></div>
          <div><span>Patrimônio</span><strong className={patrimonio >= SALDO_INICIAL ? 'ganho' : 'perda'}>{brl(patrimonio)}</strong></div>
          <div><span>Garantia bloqueada</span><strong>{brl(garantiaBloqueada)}</strong></div>
          <div><span>Disponível</span><strong className={disponivel >= GARANTIA_POR_LOTE ? '' : 'perda'}>{brl(disponivel)}</strong></div>
          <button className="btn btn-pequeno" disabled={ocupado} onClick={resetar}>Resetar conta</button>
        </div>
      </header>

      <div className="controles">
        <div className="abas" role="tablist">
          {ATIVOS.map((a) => (
            <button key={a.id} role="tab" aria-selected={a.id === ativoId}
              className={a.id === ativoId ? 'aba ativa' : 'aba'} onClick={() => setAtivoId(a.id)}>{a.nome}</button>
          ))}
        </div>
        <label>Timeframe
          <select value={tf} onChange={(e) => setTf(Number(e.target.value))}>
            {TIMEFRAMES.map((t) => <option key={t} value={t}>{t} min</option>)}
          </select>
        </label>
      </div>

      <StatusBanner />

      <main className="grade">
        <div className="coluna-grafico">
          <ChartPanel candles={candles} posicoes={conta.posicoes} ativoId={ativoId} casas={ativo.casas} passo={ativo.passo} chaveVista={`${ativoId}|${tf}`} />
        </div>
        <aside className="coluna-lateral">
          <OrderPanel ativo={ativo} precoAtual={precoAtual} ocupado={ocupado} garantia={GARANTIA_POR_LOTE} disponivel={disponivel} aviso={aviso} onOrdem={abrir} />
          <PositionsPanel posicoes={conta.posicoes} precos={precos} ocupado={ocupado} onEncerrar={encerrar} onAjustar={ajustarNiveis} />
        </aside>
      </main>

      <HistoryPanel historico={conta.historico} />
    </div>
  );
}
