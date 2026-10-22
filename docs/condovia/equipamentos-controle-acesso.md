# Equipamentos de controle de acesso — levantamento

Status: levantamento documental oficial, sem integração iniciada. Conforme o roadmap (`cronograma-e-roadmap.md`), a integração com equipamentos só começa na fase de controle de acesso inteligente, após aceite do P9.

Esta pesquisa foi feita em **20/10/2026**, apenas em documentação pública dos fabricantes. Nenhuma credencial ou equipamento real foi acessado.

## Equipamentos previstos para testes

| # | Tipo | Fabricante | Modelo | Firmware / versão informada | Situação documental |
|---|------|-----------|--------|-----------------------------|---------------------|
| 1 | Leitor de placas (LPR) | Hikvision | iDS-TCM403-BI | V5.1.2 230921 | Compatibilidade dessa versão exata não confirmada publicamente. A página oficial lista V5.5.2_260814 para variantes específicas. |
| 2 | Leitor facial | Intelbras | SS 3532 MF | não informado | A página oficial lista firmware da série SS35xx até V3.002.00IB000.0.R.260922. É necessário confirmar a aplicabilidade ao aparelho e à região. |
| 3 | Leitor facial | Hikvision | DS-K1T671MF | não informado | A página oficial lista Firmware_V3.7.80_251218 e Firmware_V1.0.3_230627; a versão aplicável deve ser confirmada pelo hardware/região. |
| 4 | Leitor facial | Hikvision | DS-K1T673DX-BR | não informado | Foi encontrada documentação da família DS-K1T673DX, com V4.56.0_260910, mas não confirmação específica do sufixo `-BR`. |

## Resultado por equipamento

### 1. Hikvision iDS-TCM403-BI — LPR

- **Firmware:** a página oficial de suporte lista `Firmware_V5.5.2_260814` para variantes da família iDS-TCM403-BI, incluindo versões com sufixos de lente/PoE. Não foi encontrada, na documentação pública consultada, confirmação de que o firmware informado no inventário (`V5.1.2 230921`) seja compatível com o modelo exato instalado, nem release note que estabeleça a rota de atualização entre essas versões.
- **QR Code no aparelho:** não encontrado publicamente para o modelo LPR consultado. A documentação localizada é de reconhecimento automático de placas; não deve ser inferido que o equipamento leia QR Code.
- **API/SDK e protocolos:** a ficha técnica oficial lista ISAPI, SDK, ISUP e ONVIF Profile S/G/T/M. Também lista TCP/IP, HTTP/HTTPS, FTP/SFTP, RTP/RTSP/RTCP, NTP, SMTP, SNMP, IPv4/IPv6, UDP e SSL/TLS. A segurança documentada inclui senha, HTTPS, 802.1X, autenticação HTTP/HTTPS Basic/Digest, ONVIF WSSE/Digest, TLS 1.2/1.3 e filtragem de IP.
- **Eventos e cadastro:** a documentação pública confirma recursos de ANPR e interfaces de integração, mas não foi encontrado publicamente o contrato completo do evento de leitura de placa — payload, callback/push, entrada/saída/negação — nem protocolo de cadastro de pessoas/liberações, que não é o fluxo principal de um LPR.
- **Fontes:** [página oficial do iDS-TCM403-BI](https://securitylab.hikvision.com/en/products/ITS-Products/traffic-cameras/urban-road-anpr-cameras/ids-tcm403-bi/); [ficha técnica](https://www.hikvision.com/content/dam/hikvision/products/S000000001/S000000177/S000000188/S000000209/OFR000286/M000019937/SM000076240/Data_Sheet/iDS-TCM403-BI_Datasheet_20240801.pdf); [documentação ISAPI](https://tpp.hikvision.com/download/ISAPI_OTAP?type=1). Consultadas em 20/10/2026.

### 2. Intelbras SS 3532 MF — facial

- **Firmware:** a página oficial lista `Firmware Série SS35xx - V3.002.00IB000.0.R.260922`, além de `...260716` e `...260416`. Não é possível concluir, apenas pelo nome, se a versão é adequada a cada lote/região.
- **QR Code no aparelho:** confirmado na página oficial do produto como forma de acesso por QR Code. O modo exato — validação local ou envio ao sistema — não foi encontrado publicamente.
- **API/SDK e protocolos:** a página pública disponibiliza referência a middleware Intelbras/Senior e MIB SNMP, mas não foi encontrado publicamente um manual de API/SDK com endpoints, protocolo de cadastro, autenticação e callbacks para o SS 3532 MF.
- **Eventos e cadastro:** não encontrado publicamente o formato dos eventos de entrada, saída e negação, nem o contrato de cadastro de pessoas, credenciais faciais, QR Code, horários e direitos. Também não foi possível confirmar publicamente se o middleware é obrigatório para cada operação.
- **Fontes:** [downloads e firmware](https://www.intelbras.com/pt-br/ajuda-download/download/controlador-de-acesso-facial-ss-3532-mf); [página do produto](https://www.intelbras.com/en/facial-access-controller-ss-3532-mf). Consultadas em 20/10/2026.

### 3. Hikvision DS-K1T671MF — facial

- **Firmware:** a página oficial lista `Firmware_V3.7.80_251218` e `Firmware_V1.0.3_230627`, ambos associados ao modelo. A documentação não esclarece qual pacote corresponde a cada revisão de hardware/região.
- **QR Code no aparelho:** confirmado como recurso do equipamento. O modo detalhado de validação — local ou consulta/envio ao sistema — não foi descrito publicamente de forma suficiente para definir o contrato.
- **API/SDK e protocolos:** o produto declara suporte a ISAPI e ISUP 5.0, com TCP/IP. A documentação ISAPI explica protocolo de aplicação sobre HTTP, com arquitetura REST, mas os guias detalhados por modelo exigem acesso/licença de integração. Endpoints, autenticação específica e callbacks não foram confirmados publicamente.
- **Eventos e cadastro:** não encontrado publicamente o payload completo de eventos de entrada, saída e negação, nem endpoints exatos para cadastro de pessoa, face, cartão, QR Code, horários e direitos.
- **Fontes:** [página do produto](https://securitylab.hikvision.com/en/products/Access-Control-Products/terminals/face-recognition-terminal/ds-k1t671mf/); [ficha técnica](https://assets.hikvision.com/prd/public/all/doc/m000039808/DS-K1T671MF_Datasheet_20231227.pdf); [documentação ISAPI](https://tpp.hikvision.com/download/ISAPI_OTAP?type=1). Consultadas em 20/10/2026.

### 4. Hikvision DS-K1T673DX-BR — facial

- **Firmware:** a documentação da família DS-K1T673DX lista `Firmware_V4.56.0_260910`. Não foi encontrada confirmação pública de que esse pacote seja aplicável ao sufixo brasileiro `DS-K1T673DX-BR` instalado.
- **QR Code no aparelho:** não confirmado para o modelo base/sufixo `-BR`. As fichas técnicas listam módulos opcionais `DS-KAB673-FBQR` e `DS-KAB673-BQR`, mas isso não confirma que o aparelho tenha o módulo ou que a função esteja habilitada.
- **API/SDK e protocolos:** a página oficial declara ISAPI, ISUP 5.0 e TCP/IP IPv4/IPv6. O portal oficial descreve ISAPI sobre HTTP/REST; guias detalhados, autenticação e endpoints não estão publicamente disponíveis sem o fluxo de integração/licença.
- **Eventos e cadastro:** não encontrado publicamente o contrato completo de eventos de entrada, saída e negação ou dos comandos de cadastro de pessoas e liberação de acesso para o sufixo `-BR`.
- **Fontes:** [página da família](https://securitylab.hikvision.com/en/products/Access-Control-Products/terminals/face-recognition-terminal/ds-k1t673dx/); [ficha técnica atual](https://assets.hikvision.com/prd/normal/all/doc/m000049931/DS-K1T673DX_Datasheet_20260210.pdf); [ficha com módulos opcionais](https://assets.hikvision.com/prd/public/all/doc/m000049931/DS-K1T673DX_Datasheet_20250321.pdf); [documentação ISAPI](https://tpp.hikvision.com/download/ISAPI_OTAP?type=1). Consultadas em 20/10/2026.

## Estado dos protocolos

| Equipamento | Cadastro de pessoas/liberações | Eventos | Autenticação |
|---|---|---|---|
| Hikvision iDS-TCM403-BI | ISAPI/SDK/ISUP/ONVIF listados, mas o contrato de cadastro de pessoas não se aplica claramente ao LPR e endpoints não foram encontrados publicamente. | Eventos ANPR fazem parte do produto, mas payload, callback e distinção operacional não foram encontrados publicamente. | Senha, HTTPS, Basic/Digest, ONVIF WSSE/Digest, TLS e filtragem de IP são listados; configuração exata por endpoint não confirmada. |
| Intelbras SS 3532 MF | não encontrado publicamente; a página aponta middleware Intelbras/Senior, sem contrato de API disponível. | não encontrado publicamente. | não encontrado publicamente. |
| Hikvision DS-K1T671MF | ISAPI e ISUP 5.0 confirmados; endpoints e autenticação específica não encontrados publicamente. | payload/callback não encontrado publicamente. | detalhe por endpoint não encontrado publicamente. |
| Hikvision DS-K1T673DX-BR | ISAPI e ISUP 5.0 confirmados para a família; endpoints do sufixo `-BR` não encontrados publicamente. | payload/callback para o sufixo `-BR` não encontrado publicamente. | detalhe por endpoint não encontrado publicamente. |

## Pendências para pedir diretamente ao fornecedor

1. Confirmar modelo exato, revisão de hardware, região e pacote de firmware aplicável.
2. Para o iDS-TCM403-BI, confirmar se `V5.1.2 230921` é compatível, a atualização recomendada e a sequência segura de upgrade.
3. Fornecer manuais de API/SDK correspondentes à versão instalada, com autenticação, TLS, usuários técnicos e exemplos.
4. Fornecer o contrato de eventos: entrada, saída, negação, placa/pessoa/QR, timestamp, dispositivo, sentido, callback/polling, retries e idempotência.
5. Fornecer o contrato de cadastro: pessoa, face, cartão, QR Code, validade, direitos, horários, revogação e sincronização offline.
6. Confirmar em quais modelos e módulos o QR Code é lido localmente e quando o conteúdo é encaminhado ao sistema. Para o DS-K1T673DX-BR, confirmar a presença dos módulos BQR/FBQR.
7. Para o SS 3532 MF, confirmar se a integração usa middleware Intelbras/Senior, qual API/protocolo está disponível e como os eventos são recebidos.
8. Confirmar política de atualização, compatibilidade retroativa, exportação de logs e retenção biométrica, considerando LGPD.

## Conclusão

Foi confirmado publicamente que o SS 3532 MF e o DS-K1T671MF possuem suporte a acesso por QR Code; no DS-K1T673DX, há módulos opcionais na família, mas não confirmação do aparelho `-BR`; para o iDS-TCM403-BI, não foi encontrada confirmação pública de leitura de QR Code. As famílias Hikvision têm interfaces ISAPI/ISUP em nível de produto, e o LPR também lista SDK/ONVIF, mas os contratos completos de cadastro e eventos não estão disponíveis publicamente nos materiais consultados. Firmware, QR Code e APIs precisam ser validados contra o número exato de série/revisão e documentação do fabricante antes de qualquer integração.

## Próximos passos (sem integração)

1. Obter do fornecedor os documentos e versões aplicáveis aos aparelhos instalados.
2. Confirmar quais modelos leem QR Code e em que modo.
3. Definir o contrato de integração no mesmo formato do provedor de teste, sem chamar nenhum aparelho.
4. Definir consentimento, retenção de dados e requisitos de LGPD antes de qualquer cadastro facial.
