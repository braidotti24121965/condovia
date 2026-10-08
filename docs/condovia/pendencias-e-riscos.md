# Pendências, riscos e decisões

## Pendências abertas

- PR #11: integração confirmada; manter apenas rastreabilidade do deployment correspondente.
- P8: iniciar por arquitetura e critérios de aceite, em novo chat Codex.
- Observabilidade centralizada, rate limit/concurrency, retenção e índices: backlog registrado no fechamento P7.
- XLSX de importação: pós-MVP, sem implementação atual.
- Revisão individual de funções legadas `SECURITY DEFINER`: executar somente com escopo e evidência.

## Riscos

- Dados dinâmicos tornam screenshots sensíveis a estado, fontes e carregamento.
- Dumps `public` não comprovam recuperação integral de Auth/Storage/configurações.
- Alterações globais de CSS podem causar regressões responsivas; preferir tokens/componentes e rollout controlado.
- Histórico de homologação pode ser imutável por auditoria e não deve ser apagado para alterar indicadores.
- Acesso remoto, SSO e variáveis Vercel precisam ser confirmados por ambiente.

## Decisões que exigem responsável

- Aprovar início do P8.
- Aprovar qualquer alteração global do Professional Compact V2.
- Definir política de retenção e operação de dados históricos.
- Aprovar arquitetura e requisitos LGPD do controle de acesso inteligente.
