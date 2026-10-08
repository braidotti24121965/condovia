# CondoVia — Pacote 7: Fechamento técnico

## Resultado

O Pacote 7 foi consolidado localmente na branch `codex/ux-v2-homolog`. A automação visual cobre 21 telas nas resoluções 390×844, 768×900, 1280×900 e 1440×900, totalizando 84 baselines.

Resultados reutilizados da Etapa 6G:

- build local com `pnpm build`: PASS;
- quatro testes direcionados: PASS;
- regressão visual completa: 84/84 PASS;
- servidor utilizado: `next start`, em `127.0.0.1:3000`;
- ambiente de dados: Supabase local em `127.0.0.1:15421`;
- contas: sintéticas locais, carregadas por arquivo privado ignorado pelo Git.

## Alterações do Pacote 7

- `playwright.config.ts`: caminho determinístico das baselines e execução serial com um worker;
- `tests/e2e/visual-regression.spec.ts`: comparação das 84 telas e espera determinística pelo fim de `.loading-page`, com marcador específico `.dashboard-v2` para o Dashboard;
- `tests/e2e/visual-responsiveness.spec.ts`, `visual-expansion.spec.ts` e `visual-interactions.spec.ts`: cobertura automatizada e evidências locais;
- `tests/e2e/fixtures.ts`, `global-setup.ts` e `load-env.ts`: fixtures sintéticas locais e carregamento privado das credenciais;
- `tests/e2e/visual-baselines/`: 84 PNGs e README de origem, resolução e regra de não atualização automática;
- `next.config.ts`: desativação do indicador de desenvolvimento durante a captura.

A remoção de `encType` em `src/components/imports/import-wizard.tsx` é uma correção funcional anterior e deve ser revisada separadamente da consolidação do harness.

## Proposta de commit futuro

Incluir somente os arquivos do harness, configurações E2E, README e as 84 baselines listadas acima. Não incluir credenciais, `.env.e2e.local`, logs, `test-results/`, capturas temporárias, relatórios descartáveis, ZIPs, dados de teste soltos ou documentos de trabalho.

As baselines não devem ser atualizadas automaticamente. Toda alteração exige autorização explícita e revisão visual do diff.

## Procedimento futuro

1. Confirmar que o Supabase local está ativo em `127.0.0.1:15421`.
2. Carregar as contas sintéticas por `.env.e2e.local`, sem registrar valores.
3. Executar `pnpm build` e iniciar `pnpm exec next start --hostname 127.0.0.1 --port 3000`.
4. Executar `pnpm exec playwright test tests/e2e/visual-regression.spec.ts`.
5. Não usar `--update-snapshots` em execuções normais.

## Pendências e riscos

- O ambiente deve permanecer local e controlado; homologação e produção não fazem parte desta automação.
- Dados dinâmicos podem exigir nova revisão autorizada das referências.
- A configuração de proteção contra indicadores de desenvolvimento não substitui a correção de erros reais.
- A integração futura deve revisar o diff antes de qualquer commit, push ou publicação.

Estado desta etapa: documentação e proposta preparadas; nenhum commit, push, merge ou deploy executado.
