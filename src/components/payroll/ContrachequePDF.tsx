import { useRef } from "react";
import { usePayrollEngine, PayrollLineItem } from "@/hooks/usePayrollEngine";
import { Button } from "@/components/ui/button";
import { FileDown, QrCode } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  professorNome: string;
  professorId: string;
  mesReferencia: string;
  items: PayrollLineItem[];
}

export const ContrachequePDF = ({ professorNome, professorId, mesReferencia, items }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);

  const totalGeral = items.reduce((s, i) => s + i.total_geral, 0);
  const totalHoras = items.reduce((s, i) => s + i.horas_realizadas, 0);
  const totalDSR = items.reduce((s, i) => s + i.dsr, 0);

  const mesLabel = new Date(mesReferencia + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const qrData = `CONTRACHEQUE|${professorId}|${mesReferencia}|${totalGeral.toFixed(2)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>Contracheque - ${professorNome}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 24px; }
        .logo-area h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
        .logo-area p { font-size: 11px; color: #888; margin-top: 2px; }
        .meta { text-align: right; font-size: 11px; color: #666; }
        .meta strong { display: block; font-size: 14px; color: #1a1a1a; margin-bottom: 4px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; padding: 8px 12px; background: #f8f8f8; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 1px solid #eee; }
        td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
        .text-right { text-align: right; }
        .mono { font-family: 'SF Mono', 'Menlo', monospace; font-size: 11px; }
        .total-row { background: #f8f8f8; font-weight: 700; }
        .total-row td { border-top: 2px solid #e5e5e5; padding: 12px; }
        .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
        .footer-text { font-size: 10px; color: #aaa; }
        .qr { opacity: 0.8; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .summary-card { padding: 12px; background: #f8f8f8; border-radius: 8px; }
        .summary-card .label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 2px; }
        .grand-total .value { color: #2563eb; font-size: 20px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
        <FileDown className="w-4 h-4" /> Gerar Contracheque PDF
      </Button>

      <div ref={printRef} className="hidden">
        <div class="header">
          <div class="logo-area">
            <h1>Diário de Classe</h1>
            <p>Sistema Educacional — Contracheque Docente</p>
          </div>
          <div class="meta">
            <strong>${professorNome}</strong>
            Referência: ${mesLabel}<br/>
            Emissão: ${new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Horas Totais</div>
            <div class="value">${totalHoras.toFixed(0)}h</div>
          </div>
          <div class="summary-card">
            <div class="label">Subtotal Aulas</div>
            <div class="value">${fmt(totalGeral - totalDSR)}</div>
          </div>
          <div class="summary-card">
            <div class="label">DSR (16.67%)</div>
            <div class="value">${fmt(totalDSR)}</div>
          </div>
          <div class="summary-card grand-total">
            <div class="label">Total Líquido</div>
            <div class="value">${fmt(totalGeral)}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Discriminação de Disciplinas</div>
          <table>
            <thead><tr>
              <th>Turma</th><th>Disciplina</th><th>Turno</th>
              <th class="text-right">Horas</th><th class="text-right">Valor/h</th>
              <th class="text-right">Subtotal</th><th class="text-right">DSR</th>
              <th class="text-right">Total</th>
            </tr></thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${item.turma_nome}</td>
                  <td><strong>${item.disciplina_nome}</strong></td>
                  <td>${item.turno}</td>
                  <td class="text-right mono">${item.horas_realizadas}h</td>
                  <td class="text-right mono">${fmt(item.valor_hora)}</td>
                  <td class="text-right mono">${fmt(item.subtotal_aulas)}</td>
                  <td class="text-right mono">${fmt(item.dsr)}</td>
                  <td class="text-right mono"><strong>${fmt(item.total_aulas)}</strong></td>
                </tr>
                ${item.estagios.length > 0 ? item.estagios.map((e) => `
                  <tr style="background:#fafafa;">
                    <td colspan="2" style="padding-left:24px;font-size:11px;">↳ Estágio: ${e.unidade}</td>
                    <td colspan="3" style="font-size:11px;">Base: ${fmt(e.valor_base)} | VT: ${fmt(e.vt_total)} | VA: ${fmt(e.va_total)}</td>
                    <td></td><td></td>
                    <td class="text-right mono">${fmt(e.subtotal)}</td>
                  </tr>
                `).join("") : ""}
              `).join("")}
              <tr class="total-row">
                <td colspan="7"><strong>TOTAL GERAL</strong></td>
                <td class="text-right mono"><strong>${fmt(totalGeral)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div class="footer-text">
            Documento gerado automaticamente pelo sistema Diário de Classe.<br/>
            Este contracheque tem validade para fins de conferência interna.
          </div>
          <img src="${qrUrl}" class="qr" width="80" height="80" alt="QR Code" />
        </div>
      </div>
    </>
  );
};
