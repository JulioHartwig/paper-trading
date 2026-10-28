import { useEffect, useReducer, useState } from 'react';
import { ATIVOS, TIMEFRAMES, SALDO_INICIAL } from './config.js';
import { reducer, calcPL } from './state/accountReducer.js';
import { carregarEstado, salvarEstado } from './state/storage.js';
import { useMarketData } from './data/useMarketData.js';
import { brl } from './lib/format.js';
import ChartPanel from './components/ChartPanel.jsx';
import OrderPanel from './components/OrderPanel.jsx';
import PositionsPanel from './components/PositionsPanel.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import StatusBanner from './components/StatusBanner.jsx';

export default function App() {
  const [conta, dispatch] = useReducer(reducer, null, carregarEstado);
  const [ativoId, setAtivoId] = useState(ATIVOS[0].id);
  const [tf, setTf] = useState(5);
  const [modo, setModo] = useState('real');
  const [precos, setPrecos] = useState({}); // último preço conhecido de cada ativo

  const ativo = ATIVOS.find((a) => a.id === ativoId);
  const { candles, erro, carregando } = useMarketData(ativo, tf, modo);
  const precoAtual = candles.length ? candles[candles.length - 1].close : null;

  // Persiste a conta a cada mudança.
  useEffect(() => salvarEstado(conta), [conta]);

  // Guarda o último preço do ativo em exibição (para calcular P/L das posições).
  useEffect(() => {
    if (precoAtual != null) setPrecos((p) => ({ ...p, [ativoId]: precoAtual }));
  }, [precoAtual, ativoId]);

  const plAberto = conta.posicoes.reduce((soma, p) => soma + calcPL(p, precos[p.ativoId] ?? p.precoEntrada), 0);
  const patrimonio = conta.saldo + plAberto;

  const abrir = (lado, lotes) =>
    dispatch({
      type: 'ABRIR',
      ordem: { ativoId, lado, lotes, precoEntrada: precoAtual, hora: new Date().toISOString(), simulado: modo === 'replay' },
    });
  const encerrar = (id) => dispatch({ type: 'ENCERRAR', id, preco: precoAtual, hora: new Date().toISOString() });
  const resetar = () => {
    if (window.confirm('Voltar ao saldo inicial e apagar posições e histórico?')) dispatch({ type: 'RESETAR' });
  };

  // Não deixa misturar preços reais e simulados enquanto há posição aberta.
  const trocaModoBloqueada = conta.posicoes.length > 0;

  return (
    <div className="app">
      <header className="topo">
        <h1>Simulador de Negociações</h1>
        <div className="resumo">
          <div><span>Saldo</span><strong>{brl(conta.saldo)}</strong></div>
          <div><span>Resultado em aberto</span><strong className={plAberto >= 0 ? 'ganho' : 'perda'}>{brl(plAberto)}</strong></div>
          <div><span>Patrimônio</span><strong className={patrimonio >= SALDO_INICIAL ? 'ganho' : 'perda'}>{brl(patrimonio)}</strong></div>
          <button className="btn btn-pequeno" onClick={resetar}>Resetar conta</button>
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
        <label>Dados
          <select value={modo} onChange={(e) => setModo(e.target.value)} disabled={trocaModoBloqueada}
            title={trocaModoBloqueada ? 'Encerre as posições abertas para trocar o modo' : ''}>
            <option value="real">Mercado real (atrasado)</option>
            <option value="replay">Replay</option>
          </select>
        </label>
      </div>

      <StatusBanner erro={erro} modo={modo} carregando={carregando} />

      <main className="grade">
        <div className="coluna-grafico">
          <ChartPanel candles={candles} posicoes={conta.posicoes} ativoId={ativoId} />
        </div>
        <aside className="coluna-lateral">
          <OrderPanel ativo={ativo} precoAtual={precoAtual} onOrdem={abrir} />
          <PositionsPanel posicoes={conta.posicoes} precos={precos} ativoId={ativoId} onEncerrar={encerrar} />
        </aside>
      </main>

      <HistoryPanel historico={conta.historico} />
    </div>
  );
}
