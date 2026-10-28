import { WORKER_URL } from '../config.js';

/** Avisos ao aluno: erro de dados, modo replay e atraso das cotações. */
export default function StatusBanner({ erro, modo, carregando }) {
  if (modo === 'replay') {
    return <p className="aviso aviso-info">Modo Replay: o gráfico repete uma sessão anterior (ou dados simulados). Não são cotações ao vivo.</p>;
  }
  if (erro) {
    return (
      <p className="aviso aviso-erro">
        Não foi possível carregar os dados: {erro} Tentaremos de novo em instantes. Se o problema continuar, mude para o modo Replay.
      </p>
    );
  }
  if (carregando) return <p className="aviso aviso-info">Carregando candles…</p>;
  return (
    <p className="aviso aviso-info">
      Dados reais com atraso de até 15 minutos{WORKER_URL ? '' : ' (via proxy público, pode falhar)'}.
    </p>
  );
}
