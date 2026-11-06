import { useEffect, useState } from 'react';
import { ATIVOS } from '../config.js';
import { sortearIntervalo } from './replayConfig.js';
import { criarMotor } from './mercado.js';

/**
 * Liga o mercado simulado: um motor por ativo, funcionando o tempo todo (mesmo com o outro ativo na tela).
 * Cada ativo recebe ticks em intervalos aleatórios (replayConfig.js). O tempo avançado é o tempo real
 * decorrido, então o mercado não "atrasa" se a aba ficar em segundo plano.
 * Retorna { [ativoId]: { fechados, formando } } ou null enquanto inicia.
 */
export function useMercado() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    // Horário local em "segundos de relógio" para o eixo do gráfico mostrar a hora do aluno.
    const agoraSeg = Date.now() / 1000 - new Date().getTimezoneOffset() * 60;
    const motores = Object.fromEntries(ATIVOS.map((a) => [a.id, criarMotor(a, agoraSeg)]));
    setEstado(Object.fromEntries(ATIVOS.map((a) => [a.id, motores[a.id].estado()])));

    const timers = {};
    ATIVOS.forEach((a) => {
      let ultimo = Date.now();
      const tick = () => {
        timers[a.id] = setTimeout(() => {
          const agora = Date.now();
          motores[a.id].avancar(agora - ultimo);
          ultimo = agora;
          setEstado((e) => ({ ...e, [a.id]: motores[a.id].estado() }));
          tick();
        }, sortearIntervalo());
      };
      tick();
    });
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  return estado;
}
