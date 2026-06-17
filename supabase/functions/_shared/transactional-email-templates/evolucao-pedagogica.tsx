/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EvolucaoPedagogicaProps {
  studentName?: string
  matricula?: string
  turma?: string
  statusBadge?: string
  avatarUrl?: string
  avaliacoes?: Array<{ label: string; value: string; percent: number; color: 'blue' | 'green' | 'yellow' }>
  frequencia?: {
    percent: number
    trend: string
    presencas: number
    atestado: number
    faltas: number
    totalAulas: number
    sparkline?: Array<'green' | 'red' | 'empty'>
  }
  cronograma?: {
    turmaCode: string
    totalDisciplinas: number
    turno: string
    inicio: string
    concluidas: number
    total: number
  }
  cabecalhoTurma?: {
    turmaNome: string
    qtdDisciplinas: number | string
    turno: string
    horario: string
    dataInicioTurma: string
  }
  gestaoCronograma?: Array<{
    id: number | string
    disciplina: string
    professor: string
    chTotal: number | string
    chDiaria: number | string
    dias: number | string
    inicio: string
    termino: string
    status: 'Concluído' | 'Atual' | 'Futuro' | string
  }>
  alerta?: { texto: string }
  conteudoAulas?: Array<{ data: string; diaSemana: string; assunto: string; status?: string }>
  hardSkills?: Array<{ label: string; percent: number; color: 'blue' | 'green' | 'yellow' }>
  softSkills?: Array<{ label: string; percent: number; color: 'blue' | 'green' | 'yellow' }>
  insightsMentoria?: string
  portalUrl?: string
}

const COLOR_MAP: Record<string, string> = {
  blue: '#1e40af',
  green: '#16a34a',
  yellow: '#eab308',
  red: '#dc2626',
}

const ProgressBar: React.FC<{ percent: number; color: 'blue' | 'green' | 'yellow' }> = ({ percent, color }) => (
  <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', backgroundColor: COLOR_MAP[color] }} />
  </div>
)

const ProgressRow: React.FC<{ label: string; value?: string; percent: number; color: 'blue' | 'green' | 'yellow' }> = ({
  label,
  value,
  percent,
  color,
}) => (
  <div style={{ marginBottom: '10px' }}>
    <Row>
      <Column>
        <Text style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
          {label}
          {value ? `: ${value}` : ''}
        </Text>
      </Column>
      <Column align="right">
        <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: 600 }}>{percent}%</Text>
      </Column>
    </Row>
    <div style={{ marginTop: '4px' }}>
      <ProgressBar percent={percent} color={color} />
    </div>
  </div>
)

const EvolucaoPedagogicaEmail: React.FC<EvolucaoPedagogicaProps> = ({
  studentName = 'Amanda Vivian',
  matricula = '2024.1.0069',
  turma = 'TE M02 - Enfermagem',
  statusBadge = 'REGULAR',
  avatarUrl,
  avaliacoes = [
    { label: 'Avaliação 1', value: '7.6', percent: 76, color: 'blue' },
    { label: 'Avaliação 2', value: '8.2', percent: 82, color: 'blue' },
    { label: 'Avaliação 3', value: '7.2', percent: 72, color: 'blue' },
    { label: 'Trabalho', value: '10.0', percent: 100, color: 'green' },
    { label: 'Média Atual', value: '7.6', percent: 76, color: 'green' },
  ],
  frequencia = {
    percent: 94,
    trend: 'Tendência Estável! (Semanas 1-4)',
    presencas: 47,
    atestado: 2,
    faltas: 1,
    totalAulas: 100,
    sparkline: ['green', 'green', 'green', 'red', 'green', 'green', 'green', 'green', 'red', 'green', 'green', 'empty'],
  },
  cronograma = {
    turmaCode: 'TE M02',
    totalDisciplinas: 28,
    turno: 'Manhã',
    inicio: '06/12/2024',
    concluidas: 22,
    total: 28,
  },
  cabecalhoTurma = {
    turmaNome: 'TE M02 - Enfermagem',
    qtdDisciplinas: 28,
    turno: 'Manhã',
    horario: '07:30 - 11:30',
    dataInicioTurma: '06/12/2024',
  },
  gestaoCronograma = [
    { id: 1, disciplina: 'Anatomia', professor: 'Prof. Ana', chTotal: 60, chDiaria: 3, dias: 20, inicio: '06/12/2024', termino: '10/01/2025', status: 'Concluído' },
    { id: 2, disciplina: 'Fisiologia', professor: 'Prof. Bruno', chTotal: 40, chDiaria: 3, dias: 14, inicio: '13/01/2025', termino: '31/01/2025', status: 'Atual' },
    { id: 3, disciplina: 'Farmacologia', professor: 'Prof. Carla', chTotal: 60, chDiaria: 3, dias: 20, inicio: '03/02/2025', termino: '28/02/2025', status: 'Futuro' },
  ],
  alerta = {
    texto: 'Os dados de alertas e encaminhamentos oficiais estão sendo anexados internamente pelo sistema e, em breve, divulgaremos novas atualizações.',
  },
  conteudoAulas = [],
  hardSkills = [
    { label: 'Aferição SSVV', percent: 100, color: 'green' },
    { label: 'Punção Venosa', percent: 88, color: 'blue' },
    { label: 'Cálculo de Medicação', percent: 78, color: 'yellow' },
  ],
  softSkills = [
    { label: 'Comunicação', percent: 90, color: 'green' },
    { label: 'Controle Emocional', percent: 60, color: 'yellow' },
    { label: 'Liderança de Equipe', percent: 75, color: 'blue' },
  ],
  insightsMentoria = 'Aluno da mentoria, é notável o seu avanço e dedicação nos estudos. Continue assim.',
  portalUrl = 'https://diariodeclasse2026.lovable.app/em-construcao',
}) => {
  const cronogramaPercent = Math.round((cronograma.concluidas / cronograma.total) * 100)

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Olá, {studentName}! Confira seu resumo de evolução pedagógica.</Preview>
      <Tailwind>
        <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '24px 0' }}>
          <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' }}>
            {/* 1. Header */}
            <Text style={{ fontSize: '16px', color: '#111827', margin: '0 0 20px', lineHeight: '1.5' }}>
              Olá, <strong>{studentName}</strong>! 👋 Confira o resumo da sua evolução pedagógica na disciplina atual:
            </Text>

            {/* 1b. Cabeçalho Geral da Turma */}
            <Section style={{ ...cardStyle, marginBottom: '16px', backgroundColor: '#f9fafb' }}>
              <Text style={{ ...sectionTitle, marginBottom: '8px' }}>📋 Cabeçalho Geral da Turma</Text>
              <Text style={headerLine}><strong>Turma:</strong> {cabecalhoTurma.turmaNome}</Text>
              <Text style={headerLine}><strong>Quantidade de Disciplinas:</strong> {cabecalhoTurma.qtdDisciplinas}</Text>
              <Text style={headerLine}><strong>Turno:</strong> {cabecalhoTurma.turno}</Text>
              <Text style={headerLine}><strong>Horário:</strong> {cabecalhoTurma.horario}</Text>
              <Text style={headerLine}><strong>Data de Início da Turma:</strong> {cabecalhoTurma.dataInicioTurma}</Text>
            </Section>

            {/* 2. Card de Perfil */}
            <Section style={cardStyle}>
              <Row>
                <Column style={{ width: '64px', verticalAlign: 'middle' }}>
                  {avatarUrl ? (
                    <Img src={avatarUrl} width="56" height="56" alt={studentName} style={{ borderRadius: '9999px', display: 'block' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '9999px', backgroundColor: '#dbeafe', textAlign: 'center', lineHeight: '56px', color: '#1e40af', fontWeight: 700, fontSize: '20px' }}>
                      {studentName.charAt(0)}
                    </div>
                  )}
                </Column>
                <Column style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
                  <Text style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>{studentName}</Text>
                  <Text style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>Matrícula: {matricula}</Text>
                  <Text style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 6px' }}>Turma: {turma}</Text>
                  <span style={{ display: 'inline-block', backgroundColor: '#15803d', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', letterSpacing: '0.5px' }}>
                    {statusBadge}
                  </span>
                </Column>
              </Row>
            </Section>

            {/* 3. Desempenho + Frequência */}
            <Section style={{ marginTop: '16px' }}>
              <Row>
                <Column style={{ width: '50%', verticalAlign: 'top', paddingRight: '6px' }}>
                  <div style={{ ...cardStyle, margin: 0, height: '100%' }}>
                    <Text style={sectionTitle}>Desempenho Acadêmico</Text>
                    {avaliacoes && avaliacoes.length > 0 ? (
                      avaliacoes.map((a) => (
                        <ProgressRow key={a.label} label={a.label} value={a.value} percent={a.percent} color={a.color} />
                      ))
                    ) : (
                      <Text style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', margin: '24px 0', textAlign: 'center' }}>
                        Disciplina em andamento
                      </Text>
                    )}
                  </div>
                </Column>
                <Column style={{ width: '50%', verticalAlign: 'top', paddingLeft: '6px' }}>
                  <div style={{ ...cardStyle, margin: 0, height: '100%', textAlign: 'center' }}>
                    <Text style={{ ...sectionTitle, textAlign: 'center' }}>Frequência Geral</Text>
                    <Text style={{ fontSize: '40px', fontWeight: 700, color: '#16a34a', margin: '4px 0', lineHeight: 1 }}>
                      {frequencia.percent}%
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#16a34a', margin: '0 0 12px' }}>{frequencia.trend}</Text>

                    <Row>
                      {[
                        { n: frequencia.presencas, l: 'Presenças' },
                        { n: frequencia.atestado, l: 'Atestado' },
                        { n: frequencia.faltas, l: 'Faltas' },
                        { n: frequencia.totalAulas, l: 'Total Aulas' },
                      ].map((it) => (
                        <Column key={it.l} align="center">
                          <Text style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>{it.n}</Text>
                          <Text style={{ fontSize: '9px', color: '#6b7280', margin: 0 }}>{it.l}</Text>
                        </Column>
                      ))}
                    </Row>

                    {/* Sparkline */}
                    <div style={{ marginTop: '12px', textAlign: 'center', whiteSpace: 'nowrap' as const }}>
                      {(frequencia.sparkline || []).map((s, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-block',
                            width: '6px',
                            height: s === 'empty' ? '8px' : s === 'red' ? '14px' : '20px',
                            marginRight: '2px',
                            backgroundColor: s === 'empty' ? '#e5e7eb' : s === 'red' ? '#dc2626' : '#16a34a',
                            borderRadius: '1px',
                            verticalAlign: 'bottom',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </Column>
              </Row>
            </Section>

            {/* 4. Gestão de Cronogramas */}
            {conteudoAulas && conteudoAulas.length > 0 && (
              <Section style={{ ...cardStyle, marginTop: '16px' }}>
                <Text style={sectionTitle}>📚 Conteúdo Programático e Plano de Aula</Text>
                <Text style={mutedSmall}>Aulas realizadas com data, dia da semana e assunto</Text>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Data</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Dia</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Assunto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conteudoAulas.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ ...tdStyle, textAlign: 'left' }}>{a.data}</td>
                        <td style={{ ...tdStyle, textAlign: 'left' }}>{a.diaSemana}</td>
                        <td style={{ ...tdStyle, textAlign: 'left' }}>{a.assunto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            <Section style={{ ...cardStyle, marginTop: '16px' }}>
              <Text style={sectionTitle}>Gestão de Cronogramas</Text>
              <Text style={mutedSmall}>Visualize e gerencie os cronogramas de disciplinas por turma</Text>
              <Text style={{ fontSize: '13px', color: '#111827', margin: '8px 0 2px' }}>
                <strong>{cronograma.turmaCode}</strong> {cronograma.totalDisciplinas} disciplina(s)
              </Text>
              <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px' }}>
                Turno: {cronograma.turno} • Início: {cronograma.inicio}
              </Text>
              <div style={{ width: '100%', height: '10px', backgroundColor: '#fef3c7', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${cronogramaPercent}%`, height: '100%', backgroundColor: '#f59e0b' }} />
              </div>
              <Text style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0', textAlign: 'right' }}>
                {cronograma.concluidas}/{cronograma.total} concluídas ({cronogramaPercent}%)
              </Text>

              {/* Tabela detalhada de disciplinas */}
              {gestaoCronograma && gestaoCronograma.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14px', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={thStyle}>#</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Disciplina</th>
                      <th style={thStyle}>CH</th>
                      <th style={thStyle}>Diária</th>
                      <th style={thStyle}>Dias</th>
                      <th style={thStyle}>Início</th>
                      <th style={thStyle}>Término</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gestaoCronograma.map((d) => {
                      const statusColor =
                        d.status === 'Concluído' ? { bg: '#dcfce7', fg: '#166534' } :
                        d.status === 'Atual' ? { bg: '#dbeafe', fg: '#1e40af' } :
                        { bg: '#fef3c7', fg: '#92400e' }
                      return (
                        <tr key={String(d.id)} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={tdStyle}>{d.id}</td>
                          <td style={{ ...tdStyle, textAlign: 'left' }}>
                            <strong style={{ color: '#111827' }}>{d.disciplina}</strong>
                            <div style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '10px' }}>Prof: {d.professor}</div>
                          </td>
                          <td style={tdStyle}>{d.chTotal}</td>
                          <td style={tdStyle}>{d.chDiaria}</td>
                          <td style={tdStyle}>{d.dias}</td>
                          <td style={tdStyle}>{d.inicio}</td>
                          <td style={tdStyle}>{d.termino}</td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', backgroundColor: statusColor.bg, color: statusColor.fg, fontSize: '10px', fontWeight: 600 }}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Section>

            {/* 5. Alertas */}
            <Section style={{ ...cardStyle, marginTop: '16px', backgroundColor: '#fefce8', border: '1px solid #fde68a' }}>
              <Text style={{ ...sectionTitle, color: '#92400e' }}>Alertas e Encaminhamentos</Text>
              <Row>
                <Column style={{ verticalAlign: 'top', paddingRight: '8px' }}>
                  <Text style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: '1.5' }}>{alerta.texto}</Text>
                </Column>
                <Column style={{ verticalAlign: 'top', width: '170px' }} align="right">
                  <div>
                    <span style={{ ...tagStyle, backgroundColor: '#bbf7d0', color: '#166534' }}>Alert level</span>
                    <span style={{ ...tagStyle, backgroundColor: '#fef08a', color: '#854d0e', marginLeft: '4px' }}>Alert level</span>
                  </div>
                </Column>
              </Row>
            </Section>

            {/* 6. Mentoria e Skills */}
            <Section style={{ ...cardStyle, marginTop: '16px' }}>
              <Text style={sectionTitle}>
                Mentoria e Skills{' '}
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6b7280', fontStyle: 'italic' }}>
                  (Sua Mentoria DOM, exclusiva, está pronta em breve divulgaremos)
                </span>
              </Text>
              <Row>
                <Column style={{ width: '50%', verticalAlign: 'top', paddingRight: '8px' }}>
                  <Text style={subTitle}>Hard Skills</Text>
                  {hardSkills.map((s) => (
                    <ProgressRow key={s.label} label={s.label} percent={s.percent} color={s.color} />
                  ))}
                </Column>
                <Column style={{ width: '50%', verticalAlign: 'top', paddingLeft: '8px' }}>
                  <Text style={subTitle}>Soft Skills</Text>
                  {softSkills.map((s) => (
                    <ProgressRow key={s.label} label={s.label} percent={s.percent} color={s.color} />
                  ))}
                </Column>
              </Row>
              <Hr style={{ borderColor: '#e5e7eb', margin: '12px 0' }} />
              <Text style={{ fontSize: '12px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Insights da Mentoria</Text>
              <Text style={{ fontSize: '12px', fontStyle: 'italic', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                "{insightsMentoria}"
              </Text>
            </Section>

            {/* 7. CTA */}
            <Section style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button
                href={portalUrl}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Ver Detalhes no Portal
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px',
  backgroundColor: '#ffffff',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 12px',
}

const subTitle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#374151',
  margin: '0 0 8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const mutedSmall: React.CSSProperties = {
  fontSize: '11px',
  color: '#6b7280',
  margin: '0 0 4px',
}

const smallBlueBtn: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: '9999px',
  textDecoration: 'none',
  display: 'inline-block',
}

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '10px',
  fontWeight: 600,
  padding: '3px 8px',
  borderRadius: '9999px',
}

const headerLine: React.CSSProperties = {
  fontSize: '12px',
  color: '#374151',
  margin: '2px 0',
  lineHeight: '1.5',
}

const thStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#374151',
  padding: '6px 4px',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  borderBottom: '1px solid #d1d5db',
}

const tdStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#374151',
  padding: '6px 4px',
  textAlign: 'center',
  verticalAlign: 'top',
}

export const template = {
  component: EvolucaoPedagogicaEmail,
  subject: (data: Record<string, any>) =>
    `📊 Evolução Pedagógica — ${data?.studentName ?? 'Aluno(a)'}`,
  displayName: 'Evolução Pedagógica',
  previewData: {
    studentName: 'Amanda Vivian',
    matricula: '2024.1.0069',
    turma: 'TE M02 - Enfermagem',
    statusBadge: 'REGULAR',
  },
}

export default EvolucaoPedagogicaEmail