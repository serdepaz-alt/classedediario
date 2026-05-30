// Converte um número (BRL) em valor por extenso em português.
// Suporta valores até 999.999.999,99.

const unidades = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];
const dezenas = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta",
  "sessenta", "setenta", "oitenta", "noventa",
];
const centenas = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(centenas[c]);
  if (resto > 0) {
    if (resto < 20) partes.push(unidades[resto]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${dezenas[d]} e ${unidades[u]}` : dezenas[d]);
    }
  }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  if (n < 1000) return ate999(n);

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];
  if (milhoes > 0) {
    partes.push(`${ate999(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
  }
  if (milhares > 0) {
    if (milhares === 1) partes.push("mil");
    else partes.push(`${ate999(milhares)} mil`);
  }
  if (resto > 0) {
    // separador "e" antes do resto somente se este < 100 ou múltiplo de 100
    const sep = partes.length > 0 ? (resto < 100 || resto % 100 === 0 ? "e " : "") : "";
    partes.push(`${sep}${ate999(resto)}`);
  }
  return partes.join(" ").replace(/\s+/g, " ").trim();
}

export function valorPorExtensoBRL(valor: number): string {
  const arred = Math.round(valor * 100) / 100;
  const reais = Math.floor(arred);
  const centavos = Math.round((arred - reais) * 100);

  const partes: string[] = [];
  if (reais > 0) {
    partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) {
    partes.push(
      `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`,
    );
  }
  if (partes.length === 0) return "zero reais";
  return partes.join(" e ");
}