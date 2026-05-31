/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export interface ProfessorContractInvitationProps {
  name?: string
  disciplina?: string
  valor?: string
  periodo?: string
  cargaHoraria?: number | string
  link?: string
}

const SITE_NAME = 'Centro de Formação Técnica em Enfermagem Irmã Dulce'

const ProfessorContractInvitationEmail = ({
  name,
  disciplina,
  valor,
  periodo,
  cargaHoraria,
  link,
}: ProfessorContractInvitationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>
      {name ? `${name}, seu contrato de prestação de serviços está disponível` : 'Seu contrato está disponível'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Heading style={h1}>
          {name ? `Olá, ${name}!` : 'Olá, professor(a)!'}
        </Heading>

        <Text style={text}>
          Você foi designado(a) para ministrar a disciplina abaixo e geramos
          automaticamente seu <strong>Contrato de Prestação de Serviços</strong>.
          Solicitamos a leitura e o <strong>aceite digital</strong> para
          formalizar a contratação.
        </Text>

        <Section style={card}>
          <Text style={cardRow}>
            <strong>Disciplina:</strong> {disciplina || '—'}
          </Text>
          {cargaHoraria && (
            <Text style={cardRow}>
              <strong>Carga horária:</strong> {cargaHoraria}h
            </Text>
          )}
          {periodo && (
            <Text style={cardRow}>
              <strong>Período:</strong> {periodo}
            </Text>
          )}
          {valor && (
            <Text style={cardRow}>
              <strong>Valor total:</strong> {valor}
            </Text>
          )}
        </Section>

        {link && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={link} style={button}>
              Visualizar e aceitar contrato
            </Button>
          </Section>
        )}

        <Text style={small}>
          Caso o botão não funcione, copie e cole este endereço no navegador:
          <br />
          <span style={{ wordBreak: 'break-all', color: '#0c4a6e' }}>{link}</span>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Este é um e-mail automático do {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProfessorContractInvitationEmail,
  subject: (data: ProfessorContractInvitationProps = {}) =>
    `Contrato de Prestação de Serviços — ${data.disciplina ?? 'Disciplina'}`,
  displayName: 'Convite de aceite de contrato (Professor)',
  previewData: {
    name: 'Maria Silva',
    disciplina: 'Anatomia Humana',
    valor: 'R$ 2.400,00',
    periodo: '01/02/2026 a 28/02/2026',
    cargaHoraria: 40,
    link: 'https://diariodeclasse2026.lovable.app/contrato/aceite?token=exemplo',
  },
}

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  padding: '32px 28px',
}
const brand: React.CSSProperties = {
  fontSize: 16,
  color: '#0c4a6e',
  margin: 0,
  fontWeight: 700,
  textAlign: 'center',
}
const h1: React.CSSProperties = {
  fontSize: 22,
  color: '#111827',
  margin: '8px 0 18px',
}
const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}
const card: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '16px 18px',
  margin: '8px 0 8px',
}
const cardRow: React.CSSProperties = {
  fontSize: 14,
  color: '#1f2937',
  margin: '4px 0',
}
const button: React.CSSProperties = {
  backgroundColor: '#0c4a6e',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: 6,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
  display: 'inline-block',
}
const small: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '12px 0 0',
}
const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}
const footer: React.CSSProperties = {
  fontSize: 11,
  color: '#9ca3af',
  textAlign: 'center',
  margin: 0,
}