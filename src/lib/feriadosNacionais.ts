/**
 * Feriados nacionais brasileiros fixos e móveis.
 * Feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi) são calculados com base na Páscoa.
 */

// Algoritmo de Meeus/Jones/Butcher para calcular a Páscoa
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface FeriadoNacional {
  data: string;
  nome: string;
  tipo: string;
}

export function getFeriadosNacionais(ano: number): FeriadoNacional[] {
  const pascoa = calcularPascoa(ano);
  const carnaval = addDays(pascoa, -47);
  const sextaSanta = addDays(pascoa, -2);
  const corpusChristi = addDays(pascoa, 60);

  return [
    { data: `${ano}-01-01`, nome: "Confraternização Universal", tipo: "feriado" },
    { data: formatDate(carnaval), nome: "Carnaval (Segunda)", tipo: "feriado" },
    { data: formatDate(addDays(carnaval, 1)), nome: "Carnaval (Terça)", tipo: "feriado" },
    { data: formatDate(addDays(carnaval, 2)), nome: "Quarta-feira de Cinzas", tipo: "ponto_facultativo" },
    { data: formatDate(sextaSanta), nome: "Sexta-feira Santa", tipo: "feriado" },
    { data: `${ano}-04-21`, nome: "Tiradentes", tipo: "feriado" },
    { data: `${ano}-05-01`, nome: "Dia do Trabalho", tipo: "feriado" },
    { data: formatDate(corpusChristi), nome: "Corpus Christi", tipo: "ponto_facultativo" },
    { data: `${ano}-09-07`, nome: "Independência do Brasil", tipo: "feriado" },
    { data: `${ano}-10-12`, nome: "Nossa Sra. Aparecida", tipo: "feriado" },
    { data: `${ano}-10-28`, nome: "Dia do Servidor Público", tipo: "ponto_facultativo" },
    { data: `${ano}-11-02`, nome: "Finados", tipo: "feriado" },
    { data: `${ano}-11-15`, nome: "Proclamação da República", tipo: "feriado" },
    { data: `${ano}-11-20`, nome: "Dia da Consciência Negra", tipo: "feriado" },
    { data: `${ano}-12-24`, nome: "Véspera de Natal", tipo: "ponto_facultativo" },
    { data: `${ano}-12-25`, nome: "Natal", tipo: "feriado" },
    { data: `${ano}-12-31`, nome: "Véspera de Ano Novo", tipo: "ponto_facultativo" },
  ];
}
