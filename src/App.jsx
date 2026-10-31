import { useEffect, useReducer, useRef, useState } from 'react';
import { ATIVOS, TIMEFRAMES, SALDO_INICIAL, ATRASO_ORDEM_MS } from './config.js';
import { reducer, calcPL, verificarSaida } from './state/accountReducer.js';
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
  // Arredonda ao número de casas exibido: o preço que o aluno vê é o preço em que a ordem é executada.
  const precoAtual = candles.length ? Number(candles[candles.length - 1].close.toFixed(ativo.casas)) : null;

  // Persiste a conta a cada mudança.
  useEffect(() => salvarEstado(conta), [conta]);

  // Guarda o último preço do ativo em exibição (para calcular P/L das posições).
  useEffect(() => {
    if (precoAtual != null) setPrecos((p) => ({ ...p, [ativoId]: precoAtual }));
  }, [precoAtual, ativoId]);

  const plAberto = conta.posicoes.reduce((soma, p) => soma + calcPL(p, precos[p.ativoId] ?? p.precoEntrada), 0);
  const patrimonio = conta.saldo + plAberto;

  // Preço mais recente, lido no momento em que a ordem é executada (não no clique).
  const precoRef = useRef(null);
  useEffect(() => { precoRef.current = precoAtual; }, [precoAtual]);

  // Stop e alvo: a cada novo preço do ativo em exibição, encerra as posições que atingiram o nível.
  // O encerramento é imediato e ao preço vigente (pode ficar um pouco além do nível, como numa ordem a mercado).
  useEffect(() => {
    if (precoAtual == null) return;
    conta.posicoes.forEach((p) => {
      if (p.ativoId !== ativoId) return; // só há preço ao vivo do ativo em exibição
      const motivo = verificarSaida(p, precoAtual);
      if (motivo) dispatch({ type: 'ENCERRAR', id: p.id, preco: precoAtual, hora: new Date().toISOString(), motivo });
    });
  }, [precoAtual, ativoId, conta.posicoes]);

  // Ordens em andamento: enquanto houver alguma, os controles ficam travados.
  const [pendentes, setPendentes] = useState(0);
  const ocupado = pendentes > 0;

  // Atraso entre o clique e a execução, ao preço vigente na hora da execução.
  const comAtraso = (acao) => {
    setPendentes((n) => n + 1);
    setTimeout(() => {
      const preco = precoRef.current;
      if (preco != null) acao(preco);
      setPendentes((n) => n - 1);
    }, ATRASO_ORDEM_MS);
  };

  // stop/alvo chegam como distâncias (ou null); viram níveis de preço a partir do preço de execução.
  const abrir = (lado, lotes, { stop, alvo }) =>
    comAtraso((preco) => {
      const direcao = lado === 'compra' ? 1 : -1;
      const nivel = (distancia, sinal) =>
        distancia == null ? null : Number((preco + sinal * direcao * distancia).toFixed(ativo.casas));
      dispatch({
        type: 'ABRIR',
        ordem: {
          ativoId, lado, lotes, precoEntrada: preco, hora: new Date().toISOString(), simulado: modo === 'replay',
          stopPreco: nivel(stop, -1), // compra: abaixo da entrada; venda: acima
          alvoPreco: nivel(alvo, +1), // compra: acima da entrada; venda: abaixo
        },
      });
    });
  const encerrar = (id) =>
    comAtraso((preco) => dispatch({ type: 'ENCERRAR', id, preco, hora: new Date().toISOString() }));
  const ajustarNiveis = (id, stopPreco, alvoPreco) => dispatch({ type: 'AJUSTAR_NIVEIS', id, stopPreco, alvoPreco });
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
          <button className="btn btn-pequeno" disabled={ocupado} onClick={resetar}>Resetar conta</button>
        </div>
      </header>

      <div className="controles">
        <div className="abas" role="tablist">
          {ATIVOS.map((a) => (
            <button key={a.id} role="tab" aria-selected={a.id === ativoId}
              className={a.id === ativoId ? 'aba ativa' : 'aba'} disabled={ocupado} onClick={() => setAtivoId(a.id)}>{a.nome}</button>
          ))}
        </div>
        <label>Timeframe
          <select value={tf} disabled={ocupado} onChange={(e) => setTf(Number(e.target.value))}>
            {TIMEFRAMES.map((t) => <option key={t} value={t}>{t} min</option>)}
          </select>
        </label>
        <label>Dados
          <select value={modo} onChange={(e) => setModo(e.target.value)} disabled={trocaModoBloqueada || ocupado}
            title={trocaModoBloqueada ? 'Encerre as posições abertas para trocar o modo' : ''}>
            <option value="real">Mercado real (atrasado)</option>
            <option value="replay">Replay</option>
          </select>
        </label>
      </div>

      <StatusBanner erro={erro} modo={modo} carregando={carregando} />

      <main className="grade">
        <div className="coluna-grafico">
          <ChartPanel candles={candles} posicoes={conta.posicoes} ativoId={ativoId} casas={ativo.casas} />
        </div>
        <aside className="coluna-lateral">
          <OrderPanel ativo={ativo} precoAtual={precoAtual} ocupado={ocupado} onOrdem={abrir} />
          <PositionsPanel posicoes={conta.posicoes} precos={precos} ativoId={ativoId} ocupado={ocupado} onEncerrar={encerrar} onAjustar={ajustarNiveis} />
        </aside>
      </main>

      <HistoryPanel historico={conta.historico} />
    </div>
  );
}
