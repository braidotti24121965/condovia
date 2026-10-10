# Estado funcional dos módulos

Classificação: **Publicado** significa presente no código e referido no handoff; **Validado historicamente** significa coberto pelos gates documentados; **Pendente** exige nova evidência antes de ser tratado como concluído.

| Módulo | Estado consolidado | Evidência/observação |
|---|---|---|
| Plataforma e administração | Publicado | Rotas de plataforma, tenants e contextos no App Router. |
| Condomínios, estruturas e unidades | Publicado e validado historicamente | CRUD e relações estruturais sob contexto do condomínio. |
| Pessoas, moradores, proprietários e vínculos | Publicado e validado historicamente | Índices, formulários compartilhados e vínculos por tenant. |
| Reservas e recursos | Publicado e validado historicamente | Agenda, filtros, paginação e transições por RPC. |
| Portaria, visitantes e prestadores | Publicado e validado historicamente | Gatehouse, autorizações, acessos, encomendas e histórico. |
| Controle de acesso e eventos | Publicado | Eventos históricos devem ser tratados como registros protegidos. |
| Encomendas e coletas | Publicado | Fluxos de packages e collections no módulo Gatehouse. |
| Ocorrências e comentários | Publicado | Detalhes, comentários, ações e histórico; PR #11 registrou o refinamento visual pontual. |
| Notificações | Publicado | Central de notificações integrada ao shell. |
| Importações | Publicado e validado historicamente | CSV, preview, classificação, confirmação, idempotência e relatório. |
| Dashboard e relatórios | Publicado e validado historicamente | Indicadores por condomínio e filtros temporais. |
| Perfil, autenticação e permissões | Publicado e validado historicamente | Supabase Auth, seleção de contexto, RBAC e RLS. |

| Manutenção | Implementação integral preparada; publicação e homologação pendentes | Fornecedores, contratos, cotações, alçadas, documentos, planos preventivos, checklists e despesas; ver entrega integral. |

## Regra de evidência

Não declarar uma tela como visualmente conforme sem captura ou inspeção correspondente. Testes unitários e build comprovam integridade técnica, não substituem homologação visual.
