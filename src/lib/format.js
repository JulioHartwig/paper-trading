const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const brl = (v) => fmtBRL.format(v);
export const preco = (v, casas) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR');
