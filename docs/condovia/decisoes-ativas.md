# Decisões ativas — contexto para agentes (Claude, Codex e equipe)

Leia este documento antes de qualquer alteração no módulo de portaria. Ele registra o que já foi decidido e o que não pode ser desfeito sem nova decisão. Atualize-o junto com cada PR relevante.

Última atualização: 21/10/2026 (tarde, após a PR #87 e a limpeza de dados de teste).

## Ambientes e deploy

- Homologação: `https://homolog-condovia.kynovia.com.br`, ligada à branch `homolog`. Banco: projeto Supabase `condovia-homolog` (`kgvbmisocqmsxcibpumq`).
- Produção: `https://condovia.kynovia.com.br`. **Não publicar em produção** sem autorização explícita.
- Deploy de validação: preview, nunca `vercel deploy --prod` (ver `operacao-e-implantacao.md`).
- Fluxo: branch a partir de `origin/homolog` → PR para `homolog` → **integração só com aprovação explícita** do responsável → validação no domínio de homologação.
- Não commitar `.env.local`, `node_modules`, cache `.next` nem capturas de tela.

## Regras de código (módulo de portaria)

- Interface: seguir o `AGENTS.md` (componentes `Button`, tokens `--cv-*`, `.cv-form-actions`, `.cv-field-error` para erro, sem cor fixa).
- Não criar migration sem necessidade. Os códigos de retirada e a chave da DC-e foram resolvidos **sem migration**.
- Segredos: nunca no cliente, nunca em log, nunca no repositório. Variáveis ficam no painel da Vercel (ambiente Preview para homologação).

## Passe de visitante (QR de autorização)

- O token do passe é aleatório, guardado só como hash SHA-256 (`pass_token_hash`). O QR mostra o token, não o ID da autorização.
- Gerar novo QR invalida o anterior. O QR só existe enquanto a tela está aberta: sem token em memória, é preciso gerar de novo.
- A página pública `/pass/[token]` mostra visitante, unidade e validade. **Não** mostra observações nem IDs internos.
- Consulta na portaria: `checkVisitorPassAction`, somente leitura.
- Registro de entrada: `registerEntryAction` → RPC `register_access_entry`. Entrada duplicada é recusada pelo banco.

## Leitura de QR pela câmera

- Decodificação com **jsQR** em JavaScript, em qualquer navegador. Não usar `BarcodeDetector` (o nativo do Chrome não leu QR de tela de celular no teste).
- Gerador de QR: biblioteca `qrcode` (MIT) através do adaptador `QrCode` em `src/lib/gatehouse/qrcode.ts`. O gerador próprio antigo produzia códigos que leitores não liam; foi removido.
- Teste obrigatório de ida e volta: gerar com o projeto, decodificar com `decodeQrFrame`.

## Liberação automática pelo passe

- Na validação da portaria, a leitura pela câmera registra a entrada **sozinha** quando o passe está ativo, a autorização foi localizada e há ponto de acesso ativo (`canAutoRegisterEntry`).
- Passes agendados, expirados ou inválidos nunca são registrados automaticamente.
- Consulta por link colado continua exigindo o botão "Registrar entrada".

## Encomendas

- Recebimento: o botão "Ler QR da etiqueta" preenche as observações com `Chave DC-e: <44 dígitos>` (quando o QR for o da DC-e) ou com `Código da etiqueta: <texto>`. O recebimento só é salvo com o clique em "Confirmar Recebimento". Sem migration.
- Retirada: decidido que o morador recebe um **código de retirada assinado** (ID da encomenda + validade de 7 dias, HMAC-SHA256 com `PACKAGE_PICKUP_SECRET`). Nada é guardado no banco. Gerar novo código **não** invalida o anterior; ambos valem até o prazo ou até a retirada (a encomenda deixa de estar `received`).
- Regra de código: `src/lib/gatehouse/package-pickup.ts`, com testes.
- A área do morador mostra o QR de retirada e permite compartilhar a imagem do QR (PRs #74 e #77, integradas). Só moradores e proprietários vigentes da unidade geram o código.
- A **liberação na portaria** pelo código está implementada (PR #76): conferência de assinatura, prazo e status, e confirmação do porteiro antes de registrar a retirada.

## Pendências conhecidas

- Forma de prova da retirada: hoje o registro usa a observação "Retirada com código de retirada do morador". Campo próprio para a forma de prova exige migration e não foi decidido.
- Padronizar o leitor de QR do passe e o da etiqueta em um componente único (`qr-camera-reader` já existe e é reutilizável).

## Preferências da equipe

- Mudanças que afetam o ambiente compartilhado (migrations, deploys, integração na `homolog`, dados de teste) só com autorização explícita.
- Passo a passo: uma etapa aprovada por vez.
- Dados de teste criados no homolog (visitante "Visitante Teste QR Homolog", "Portaria Teste QR", "Portaria Teste 2") podem ser mantidos ou removidos somente se a equipe pedir.

## Estado atual (21/10/2026)

Integrado na `homolog` nesta frente: PRs #65 a #87, além das de documentação #75 e #84 e #85. A partir da PR #72, o recebimento de encomenda lê a chave da DC-e da etiqueta, avisa duplicidade e permite confirmar o recebimento mesmo assim.

Abertas e **não integradas**:
- PR #52: recuperação de senha em qualquer navegador. Não é desta frente.
- PR #88: este documento. Só documentação.

Validado no homolog: troca de conta na mesma aba, leitura do passe com entrada automática, bloqueio de visitante já dentro, compartilhamento do QR como imagem, liberação de encomenda com código de retirada, leitura da etiqueta da J&T com aviso de duplicidade, exclusão de encomenda aguardando retirada.

## Fluxo de trabalho para agentes (Codex e Claude)

1. Ler este documento e `AGENTS.md` antes de qualquer alteração.
2. Trabalhar em branch nova a partir de `origin/homolog`. Nunca na `main`.
3. Validar localmente: `pnpm typecheck`, `pnpm lint`, `npx vitest run src/lib/gatehouse src/components/gatehouse`, `pnpm run build`.
4. Abrir PR contra `homolog` e **parar aí**. Não integrar.
5. A integração só acontece após autorização explícita do responsável. Depois da integração, o deploy de preview do domínio de homologação é verificado pelo status do commit.
6. Nunca usar `--prod`. Nunca alterar produção.
7. Mudanças no banco (migration, dados de teste) só com autorização explícita. Dados de teste do homolog estão listados nas pendências.

## Dados de teste no homolog

- Estado após a limpeza de 21/10/2026: **sem encomendas e sem registros de retirada** no condomínio "Condomínio Teste P8".
- Permanecem: visitantes de teste (incluindo "Visitante Teste QR Homolog" e "Priscilla da Costa Braidotti"), autorizações e pontos de acesso ("Portaria Teste QR" ativo, "Portaria Teste 2" inativo), e o morador de teste `morador_teste@kynovia.com.br`.
- Limpezas feitas pelo SQL do homolog não atualizam o cache das telas. Após qualquer limpeza direta no banco, recarregar a página com Cmd+Shift+R antes de testar.

## Atualização da tarde (21/10/2026)

Integrado desde a última versão deste documento:
- PR #79: troca de conta na mesma aba sem reaproveitar páginas da conta anterior. Validado.
- PR #80: leitura repetida do passe volta a consultar quando o QR sai do quadro e volta.
- PR #81: passe de pessoa já dentro mostra "Já está dentro" e não tenta nova entrada.
- PR #82 e #83: layout da validação do passe (câmera e colagem lado a lado; resultado na coluna da direita).
- PR #84, #85: documentação de estado.
- PR #86 e #87: exclusão de encomenda aguardando retirada (com confirmação) e ajuste de layout da tabela.

Regras de exclusão:
- Só é possível excluir encomenda com status `received` do próprio condomínio. Encomendas já retiradas são preservadas no histórico pela aplicação.
- Limpezas de dados de teste feitas diretamente no banco do homolog só com autorização explícita do responsável.

Pendências abertas:
- PR #52 (recuperação de senha): fora desta frente, não revisar sem pedido.
- Erro intermitente "Não foi possível carregar todos os dados agora" no painel do gestor, observado uma vez após o deploy. Não reproduzido nas consultas diretas do banco. Se voltar, coletar os logs de runtime da Vercel das consultas units, unit_occupancies, reservations, occurrences e import_batches.
- Leitura do QR de etiqueta: validada com a etiqueta real da J&T. Qualquer outra transportadora deve ser testada antes de considerar o fluxo generalizado.

Cuidados com ferramentas:
- Não rodar `vercel deploy` a partir de uma worktree sem vínculo com o projeto `condovia`. Isso cria um projeto novo na Vercel. Para publicar, usar sempre o fluxo de PR para `homolog`, que dispara o deploy de preview automaticamente.
- O projeto `acesso-wt`, criado por engano, foi apagado.
