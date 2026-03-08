import { useRef } from "react";
import { PayrollLineItem } from "@/hooks/usePayrollEngine";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  professorNome: string;
  professorId: string;
  mesReferencia: string;
  items: PayrollLineItem[];
}

export const ContrachequePDF = ({ professorNome, professorId, mesReferencia, items }: Props) => {
  const totalGeral = items.reduce((s, i) => s + i.total_geral, 0);
  const totalHoras = items.reduce((s, i) => s + i.horas_realizadas, 0);
  const totalDSR = items.reduce((s, i) => s + i.dsr, 0);

  const mesLabel = new Date(mesReferencia + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const qrData = `CONTRACHEQUE|${professorId}|${mesReferencia}|${totalGeral.toFixed(2)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

  const handlePrint = () => {
    const rows = items.map((item) => {
      let html = `<tr>
        <td>${item.turma_nome}</td>
        <td><strong>${item.disciplina_nome}</strong></td>
        <td>${item.turno}</td>
        <td style="text-align:right;font-family:monospace;font-size:11px;">${item.horas_realizadas}h</td>
        <td style="text-align:right;font-family:monospace;font-size:11px;">${fmt(item.valor_hora)}</td>
        <td style="text-align:right;font-family:monospace;font-size:11px;">${fmt(item.subtotal_aulas)}</td>
        <td style="text-align:right;font-family:monospace;font-size:11px;">${fmt(item.dsr)}</td>
        <td style="text-align:right;font-family:monospace;font-size:11px;"><strong>${fmt(item.total_aulas)}</strong></td>
      </tr>`;
      item.estagios.forEach((e) => {
        html += `<tr style="background:#fafafa;">
          <td colspan="2" style="padding-left:24px;font-size:11px;">↳ Estágio: ${e.unidade}</td>
          <td colspan="3" style="font-size:11px;">Base: ${fmt(e.valor_base)} | VT: ${fmt(e.vt_total)} | VA: ${fmt(e.va_total)}</td>
          <td></td><td></td>
          <td style="text-align:right;font-family:monospace;font-size:11px;">${fmt(e.subtotal)}</td>
        </tr>`;
      });
      return html;
    }).join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Contracheque - ${professorNome}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e5e5;padding-bottom:20px;margin-bottom:24px}
      .logo h1{font-size:18px;font-weight:700;letter-spacing:-0.5px}
      .logo p{font-size:11px;color:#888;margin-top:2px}
      .meta{text-align:right;font-size:11px;color:#666}
      .meta strong{display:block;font-size:14px;color:#1a1a1a;margin-bottom:4px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .card{padding:12px;background:#f8f8f8;border-radius:8px}
      .card .lbl{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px}
      .card .val{font-size:16px;font-weight:700;margin-top:2px}
      .grand .val{color:#2563eb;font-size:20px}
      .stitle{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;font-weight:600}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;padding:8px 12px;background:#f8f8f8;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:1px solid #eee}
      td{padding:8px 12px;border-bottom:1px solid #f0f0f0}
      .total-row{background:#f8f8f8;font-weight:700}
      .total-row td{border-top:2px solid #e5e5e5;padding:12px}
      .footer{margin-top:32px;padding-top:20px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:flex-end}
      .footer-text{font-size:10px;color:#aaa}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      <div class="logo"><h1>Diário de Classe</h1><p>Sistema Educacional — Contracheque Docente</p></div>
      <div class="meta"><strong>${professorNome}</strong>Referência: ${mesLabel}<br/>Emissão: ${new Date().toLocaleDateString("pt-BR")}</div>
    </div>
    <div class="grid">
      <div class="card"><div class="lbl">Horas Totais</div><div class="val">${totalHoras.toFixed(0)}h</div></div>
      <div class="card"><div class="lbl">Subtotal Aulas</div><div class="val">${fmt(totalGeral - totalDSR)}</div></div>
      <div class="card"><div class="lbl">DSR (16.67%)</div><div class="val">${fmt(totalDSR)}</div></div>
      <div class="card grand"><div class="lbl">Total Líquido</div><div class="val">${fmt(totalGeral)}</div></div>
    </div>
    <div class="stitle">Discriminação de Disciplinas</div>
    <table>
      <thead><tr><th>Turma</th><th>Disciplina</th><th>Turno</th><th style="text-align:right">Horas</th><th style="text-align:right">Valor/h</th><th style="text-align:right">Subtotal</th><th style="text-align:right">DSR</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}
        <tr class="total-row"><td colspan="7"><strong>TOTAL GERAL</strong></td><td style="text-align:right;font-family:monospace"><strong>${fmt(totalGeral)}</strong></td></tr>
      </tbody>
    </table>
    <div class="footer">
      <div class="footer-text">Documento gerado automaticamente pelo sistema Diário de Classe.<br/>Este contracheque tem validade para fins de conferência interna.</div>
      <img src="${qrUrl}" width="80" height="80" alt="QR Code" style="opacity:0.8" />
    </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
      <FileDown className="w-4 h-4" /> Contracheque PDF
    </Button>
  );
};
