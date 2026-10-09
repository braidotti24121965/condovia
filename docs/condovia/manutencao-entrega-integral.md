# Manutenção — entrega integral

## Escopo implementado

Esta entrega amplia P8.1–P8.3 com fornecedores CPF/CNPJ, contratos e vigências, tipos de serviço, cotações e seleção, aprovações financeiras por valor/perfil/quórum, documentos privados com versões, custos e despesas, planos preventivos recorrentes, checklists, equipe, histórico e alertas. Equipamentos recebem edição e detalhes; ocorrências podem originar OS vinculadas. As novas telas ficam na navegação de Manutenção.

Fornecedores reutilizam `service_providers`. As decisões e documentos preservam histórico. O isolamento por condomínio e as permissões são verificados no banco e nas ações do servidor. Valores financeiros exigem permissão própria, inclusive na leitura das OS.

## Regras de operação

- Aprovação financeira vem habilitada. Sem regra específica, o síndico aprova; acima do limite configurado também é necessário o conselho. É necessário atribuir usuários ao perfil de conselho: a migration não cria pessoas nem memberships.
- Todas as regras ativas que abrangem o valor devem ser atendidas. Quóruns exigem pessoas distintas, inclusive entre etapas. Alterações comerciais invalidam a aprovação anterior; rejeições e novas revisões preservam decisões e nomes históricos.
- Contratos obrigatórios, vigência, prestador ativo, documentos e itens obrigatórios do checklist bloqueiam as transições pertinentes da OS. Contratos já utilizados não permitem alteração silenciosa da identidade comercial; registrar novo contrato/aditivo.
- Custos positivos exigem registro explícito do realizado antes da conclusão. A validação gera uma única despesa por OS. A tela financeira e o CSV entregam lançamentos para integração; não substituem o futuro módulo financeiro nem marcam exportações como integração concluída.
- Documentos usam bucket privado, envio direto por URL assinada, limite de 10 MB e download temporário autorizado. Novas versões preservam anteriores. Tipos aceitos: PDF, JPEG, PNG, DOCX e XLSX.
- Planos geram OS de forma idempotente, copiam checklists e avançam a próxima data pelo intervalo configurado. Há geração manual e tarefa diária, quando `pg_cron` está disponível, às 10:00 UTC. Datas operacionais respeitam o fuso do condomínio. Alertas cobrem atrasos e vencimentos de contratos/garantias.

## Verificação técnica realizada

Lint, TypeScript, build de produção e os 9 testes existentes de notificações/exibição de prestador passaram. Todas as migrations foram executadas em PostgreSQL 17 via PGlite com estruturas auxiliares de Auth/Storage; `supabase/tests/maintenance_complete.sql` passou com cenários transacionais de isolamento, aprovações, revisões, contratos, checklists, despesas, recorrência e proteção de documentos.

Essa verificação não é homologação funcional. O envio HTTP real ao Storage, a tarefa em `pg_cron` real e o fluxo completo no ambiente publicado não foram homologados. A definição dos testes funcionais foi adiada por orientação do responsável.

## Implantação pendente

O ambiente Supabase consultado possui P8.1/P8.2, mas ainda não possui `maintenance_work_orders` de P8.3. As versões remotas de P8.1/P8.2 diferem dos timestamps no Git. Nenhuma migration desta entrega foi aplicada remotamente.

Antes da publicação:

1. Conciliar o histórico remoto de migrations por nome e conteúdo; não reaplicar cegamente migrations existentes com timestamps diferentes.
2. Aplicar a migration de P8.3 e verificar seus objetos e permissões.
3. Aplicar `20261011000000_maintenance_complete.sql`, após P8.3, e publicar o código correspondente.
4. Conferir o job `condovia-maintenance-daily`, o bucket privado e os perfis/permissões do condomínio; definir a homologação funcional.

A nova migration está ordenada após `20261010000000` de P8.3, já existente no repositório. Esse timestamp representa a ordem de implantação, não uma afirmação de publicação nessa data.
