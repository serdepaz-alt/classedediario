## Visão Geral

Quando o admin vincular um professor a uma disciplina no diálogo "Cadastro de Sequência de Disciplinas por Turma", o sistema irá:
1. Validar se o cadastro do professor tem os dados necessários (avisar se faltar algo).
2. Gerar um PDF do Contrato de Trabalho preenchido automaticamente.
3. Salvar o PDF no storage e registrar em uma tabela `contratos_professores`.
4. Enviar e-mail ao professor com link para visualizar o contrato e dar **aceite digital**.
5. Registrar o aceite (data/hora/IP) ao clicar no link.

## Etapas

### 1. Banco de dados (migração)

**Adicionar colunas em `cad_professores`:**
- `estado_civil` (text)
- `profissao` (text)
- `endereco_rua`, `endereco_numero`, `endereco_bairro`, `endereco_cep` (text)
- (manter `endereco` legado por compat)

**Criar tabela `contratos_professores`:**
- `professor_id`, `disciplina_id`, `turma_id`, `user_id`
- `valor_numerico`, `valor_extenso`, `carga_horaria`, `periodo_aulas`
- `pdf_storage_path`, `token_aceite` (uuid único)
- `status` ('enviado' | 'aceito' | 'recusado')
- `aceito_em`, `aceito_ip`
- RLS: admin gerencia seus contratos; aceite via edge function pública por token.

**Bucket de storage** `contratos` (privado, signed URLs).

### 2. Cadastro do Professor (UI)

Adicionar no `ProfessorFormDialog` os novos campos (estado civil, profissão, endereço destrinchado em rua/nº/bairro/CEP). Manter o campo `endereco` atual como referência ou migrar.

### 3. Edge Function `generate-professor-contract`

- Recebe `{ professor_id, disciplina_id, turma_id }`.
- Carrega dados do professor + disciplina.
- Renderiza PDF do contrato (usando `pdf-lib` via npm) com:
  - Logo do Centro de Formação (cabeçalho)
  - Dados da CONTRATANTE fixos (Luciano Kleber...)
  - Dados do CONTRATADO preenchidos
  - Cláusula 3 com carga horária da disciplina
  - Cláusula 9 com valor (`valor_hora × carga_horaria_total`), valor por extenso, nome da disciplina, período
  - Local: "Salvador" + data atual
  - Campo de assinatura (linha + nome)
- Faz upload ao bucket `contratos/<user_id>/<contrato_id>.pdf`.
- Insere registro em `contratos_professores`.
- Dispara e-mail transacional ao professor com link de aceite.

### 4. Infraestrutura de E-mail

- Configurar Lovable Emails (domínio + setup_email_infra).
- Template transacional `professor-contract-invitation` em React Email com botão "Visualizar e Aceitar Contrato" que aponta para `/contrato/aceite?token=<uuid>`.

### 5. Página `/contrato/aceite`

- Lê o `token` da URL.
- Edge function pública `get-contract-by-token` retorna PDF signed URL + dados do contrato.
- Exibe o PDF embed + nome do professor + checkbox "Li e aceito os termos" + botão "Aceitar Contrato".
- Edge function `accept-contract` marca `status='aceito'`, grava `aceito_em` e `aceito_ip`.

### 6. Trigger no `SequenciaDisciplinasDialog`

Ao salvar (ou ao vincular professor a uma disciplina), para cada item com `nome_professor` definido:
- Validar cadastro do professor: se faltarem CPF/RG/endereco/estado_civil/profissao, exibir **toast de aviso** mas continuar (validação não bloqueante).
- Chamar `generate-professor-contract` em background.
- Mostrar toast de sucesso "Contrato enviado para <Professor> por e-mail."
- Idempotência: não regerar se já existe contrato 'enviado' ou 'aceito' para o trio (professor_id, disciplina_id, turma_id).

### 7. Aba "Contratos" (opcional rápido)

Pequena seção na página de Professores listando contratos com status, data de envio e botão para baixar/reenviar.

## Variáveis Mapeadas

| Template | Origem |
|---|---|
| `professor.nome`, `estado_civil`, `profissao`, `rg`, `cpf` | `cad_professores` |
| `endereco_rua`, `endereco_numero`, `endereco_bairro`, `endereco_cep` | `cad_professores` (novos campos) |
| `disciplina.nome`, `carga_horaria_total` | `disciplinas` / `padroes_disciplinas` |
| `disciplina.periodo_aulas` | `data_inicio` a `data_termino` da disciplina |
| `contrato.valor_numerico` | `valor_hora × carga_horaria_total` |
| `contrato.valor_extenso` | conversão em runtime (lib `extenso`) |
| `sistema.data_atual` | `new Date()` no momento da geração |

## Observações Técnicas

- PDF gerado com `pdf-lib` (mais leve que puppeteer para edge functions).
- Valor por extenso via biblioteca `extenso` (npm) ou implementação manual em PT-BR.
- Bucket privado: contrato acessado por signed URL (validade 24h) na página de aceite.
- O token de aceite é uuid armazenado na tabela e validado server-side.

## Fora de Escopo (nesta fase)

- Assinatura digital com certificado ICP-Brasil (apenas aceite click-through).
- Geração de aditivos ou contratos em lote.
- Edição manual do contrato gerado.
