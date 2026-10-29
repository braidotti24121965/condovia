# Simulação com registros de acesso

Implementação preparada na branch `codex/simulated-access-records`, para PR contra `homolog`.

## Escopo

Reutiliza o processador do commit `9859840`, trazido para a branch porque ele estava na `main`, mas ainda não na `homolog`. Não se comunica com equipamentos reais.

- Tela `/app/gatehouse/simulation`, acessível pela aba Simulação em Portaria → Pontos de acesso.
- Restrita à permissão `structures.manage` e ao backend `condovia-homolog`. Página e ações bloqueiam Production; as RPCs conferem também o emissor assinado do JWT de homologação.
- Permite cadastrar um simulador sem credenciais em um ponto ativo e selecionar uma das 200 autorizações mais recentes de visitantes/prestadores do condomínio.
- Entrada e saída geram `access_events` com origem `device` e observação `SIMULAÇÃO`, aparecendo no histórico e na presença existente.
- Negações ficam no ledger `access_simulations`, sem mudar a presença.
- Duplicidade pelo par equipamento/identificador e comparação com registro manual da mesma pessoa/ponto/tipo em uma janela de 30 segundos.
- Autorizações vencidas ou não aprovadas geram registros inconsistentes. São eventos factuais simulados, não uma liberação de porta.
- Não inclui moradores/proprietários nem tentativas sem pessoa identificada; essas decisões continuam pendentes no desenho interno.

## Banco e segurança

Migration `20261027224549_simulated_access_records.sql`, preparada e não aplicada.

Cria o ledger com RLS, acesso de leitura do gestor e imutabilidade; não muda constraints antigas de `access_events`. Duas RPCs usam `SECURITY DEFINER` porque clientes não recebem INSERT no ledger e a gravação de acesso + ledger + auditoria precisa ser atômica. Ambas validam autenticação, permissão e condomínio; o ponto precisa pertencer ao equipamento e ao condomínio. EXECUTE é revogado de PUBLIC/anon. Locks serializam reenvios e registros da mesma pessoa. Dados de classificação do navegador nunca são aceitos.

Pré-requisito: migration de `access_devices` e campos de origem em `access_events` já aplicados. Inspeção somente leitura confirmou essas estruturas na homologação em 27/10/2026; nenhum equipamento estava cadastrado.

## Validação

- Testes Vitest do processador, ações e bloqueio de ambiente.
- `simulation-database.test.ts` executa a migration real em PostgreSQL em memória (PGlite) com tabelas pré-requisito mínimas e auxiliares de autenticação/permissão simulados. Verifica gravação, deduplicação, negação sem acesso, saída, fora de ordem, inconsistência, equipamento/autorização/condomínio inválidos, horário futuro, permissão, emissor de produção, imutabilidade, RLS e restrição de escrita direta/anon.
- Isso não substitui teste integrado com as funções e permissões reais do Supabase. Docker local indisponível; nenhum teste gravou no banco compartilhado.
- Inspeção visual local dos componentes reais com dados fictícios em 1440, 768 e 390 px; controles dentro da tela e botões em uma linha. Não equivale ao fluxo autenticado completo.

## Roteiro após autorização para migration e integração

1. Aplicar somente esta migration no `condovia-homolog`, revisar advisors e integrar o PR em `homolog`. Não aplicar em produção.
2. Confirmar o commit READY no domínio oficial.
3. Entrar como gestor, selecionar o condomínio e abrir Portaria → Pontos de acesso → Simulação.
4. Cadastrar o simulador em um ponto ativo. Usar apenas autorizações de teste.
5. Gerar identificador, selecionar autorização válida e Entrada liberada. Conferir histórico e presença com a marca SIMULAÇÃO.
6. Reenviar o mesmo identificador/equipamento: deve informar duplicidade, sem novo acesso.
7. Gerar outro identificador e simular Saída liberada: a pessoa deixa a presença.
8. Gerar outro identificador e simular Acesso negado: aparece no ledger da tela, sem alteração da presença.
9. Usar autorização de teste vencida/não aprovada: registrar a inconsistência e conferir a observação no histórico.
10. Testar usuário sem permissão e confirmar bloqueio. Produção não deve expor a página nem aceitar as RPCs.

Registros são históricos imutáveis. Não apagar dados após o teste sem nova autorização. Não houve criação de dados nem aplicação de migration nesta entrega.
