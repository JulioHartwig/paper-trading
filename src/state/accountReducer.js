import { ATIVOS, SALDO_INICIAL } from '../config.js';

/** Lucro/prejuízo (R$) de uma posição ao preço informado. */
export function calcPL(pos, precoAtual) {
  const ativo = ATIVOS.find((a) => a.id === pos.ativoId);
  const direcao = pos.lado === 'compra' ? 1 : -1; // venda ganha quando o preço cai
  return (precoAtual - pos.precoEntrada) * direcao * pos.lotes * ativo.multiplicador;
}

/**
 * Confere se o preço atingiu o stop ou o alvo da posição.
 * Retorna 'stop', 'alvo' ou null. Stop e alvo são níveis de preço opcionais (stopPreco / alvoPreco).
 */
export function verificarSaida(pos, preco) {
  const direcao = pos.lado === 'compra' ? 1 : -1;
  if (pos.stopPreco != null && (preco - pos.stopPreco) * direcao <= 0) return 'stop';
  if (pos.alvoPreco != null && (preco - pos.alvoPreco) * direcao >= 0) return 'alvo';
  return null;
}

export const estadoInicial = () => ({
  saldo: SALDO_INICIAL, // saldo realizado (só muda ao encerrar posições)
  posicoes: [],
  historico: [],
  proximoId: 1,
});

export function reducer(state, action) {
  switch (action.type) {
    case 'ABRIR':
      return {
        ...state,
        posicoes: [...state.posicoes, { id: state.proximoId, ...action.ordem }],
        proximoId: state.proximoId + 1,
      };
    case 'ENCERRAR': {
      const pos = state.posicoes.find((p) => p.id === action.id);
      if (!pos) return state;
      const resultado = calcPL(pos, action.preco);
      return {
        ...state,
        saldo: state.saldo + resultado,
        posicoes: state.posicoes.filter((p) => p.id !== action.id),
        historico: [
          { ...pos, precoSaida: action.preco, horaSaida: action.hora, resultado, motivo: action.motivo || 'manual' },
          ...state.historico,
        ],
      };
    }
    case 'LIQUIDAR': { // patrimônio zerado: encerra todas as posições aos preços vigentes (action.precos[ativoId])
      if (!state.posicoes.length) return state;
      let saldo = state.saldo;
      const encerradas = state.posicoes.map((pos) => {
        const preco = action.precos[pos.ativoId];
        const resultado = calcPL(pos, preco);
        saldo += resultado;
        return { ...pos, precoSaida: preco, horaSaida: action.hora, resultado, motivo: 'liquidacao' };
      });
      return { ...state, saldo, posicoes: [], historico: [...encerradas.reverse(), ...state.historico] };
    }
    case 'AJUSTAR_NIVEIS': // move ou remove stop/alvo de uma posição aberta (null remove)
      return {
        ...state,
        posicoes: state.posicoes.map((p) =>
          p.id === action.id ? { ...p, stopPreco: action.stopPreco, alvoPreco: action.alvoPreco } : p
        ),
      };
    case 'RESETAR':
      return estadoInicial();
    default:
      return state;
  }
}
