# CondoVia — Documento mestre do sistema

## Estado executivo

O CondoVia é um SaaS multi-tenant da Kynovia para gestão condominial. A branch principal contém o MVP-1 publicado, incluindo autenticação, contexto, RBAC/RLS, cadastros estruturais, portaria, reservas, ocorrências, dashboard e importação CSV. A produção é `https://condovia.kynovia.com.br`.

O redesign Professional Compact V2 e os refinamentos da tela de detalhes de ocorrências foram implementados e publicados por PRs anteriores. O PR #11 contém apenas o refinamento pontual mais recente e consta como integrado no GitHub durante esta atualização.

## Princípios permanentes

- Condomínio é o tenant operacional.
- Acesso é determinado por contexto, membership, RBAC, permissões granulares e RLS.
- `service_role` não é usada no frontend.
- Alterações de status passam pelos fluxos de domínio/RPC autorizados.
- Migrations aplicadas não são editadas; correções usam nova migration.
- Dados históricos e de auditoria são preservados por padrão.
- Produção, homologação e Supabase local são ambientes distintos.

## Estado de entrega

P1–P7 e MVP-1 estão registrados como concluídos no handoff de 06/10/2026. A evidência operacional deve ser lida junto com os checks atuais do GitHub/Vercel; este documento não transforma um check histórico em validação nova.

## Próximo marco

P8 — Maintenance, ainda sem implementação autorizada. O controle de acesso inteligente é uma fase futura de planejamento, não uma integração iniciada.
