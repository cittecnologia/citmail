# 0009. Fonte da consulta de domínio e TLDs aceitos

Status: aceito
Data: 2026-09-25

## Contexto

Hoje a consulta de domínio da landing é simulada: lista fixa e `setTimeout` em `index.html`. A E1-H2 (#90) troca isso por uma consulta real pelo endpoint `GET /api/dominios/disponibilidade`, com estes requisitos:

- Nome inválido ou TLD (domínio de topo) não suportado: 400, sem chamar o provedor.
- Provedor fora do ar ou lento (> 5 s): "não foi possível verificar agora", e o visitante segue.
- Mais de N consultas por minuto do mesmo IP: 429.
- Nos testes, provedor mockado.

O checkout vende hoje só domínio `.com.br`. O registro de domínio novo é manual no mvp (E4-H4). A PoC da Skymail (#48) pode mostrar que a Skymail ou um revendedor oferece consulta e registro.

Esta é uma proposta provisória.

## Opções consideradas

### Opção 1: RDAP público do Registro.br, consultado pela API
RDAP (protocolo de acesso a dados de registro) é o sucessor do WHOIS, com resposta HTTP e JSON. O Registro.br publica o serviço em `rdap.registro.br`. Domínio registrado responde 200; não encontrado responde 404.

### Opção 2: WHOIS
Protocolo antigo, em texto livre, com formato de resposta que varia e limites de consulta mais rígidos. Exige conexão TCP própria e interpretação de texto.

### Opção 3: API da Skymail ou de um revendedor de domínios
Unifica consulta e, no futuro, registro automático (E4-H6). Depende da PoC (#48) e de contrato.

## Decisão

Proposto: Opção 1, provisória.

- A landing chama só a API CITMail. A API consulta o RDAP do Registro.br.
- TLD aceito: só `.com.br`. Outro TLD responde 400.
- Validação do nome antes de montar a URL do RDAP, pelas regras de nome do Registro.br (tamanho, caracteres, hífen). Só nome validado e normalizado entra na URL, codificado. Regras exatas na #90.
- Chamada ao RDAP sem seguir redirecionamentos (`redirect: 'manual'`; redirecionamento conta como "indisponível") e com limite de tamanho da resposta (proposta: 64 KiB; acima disso, "indisponível").
- Cache curto no Redis por nome normalizado (proposta: 5 min, para livre e para ocupado).
- Tempo limite de 5 s na chamada ao RDAP. Falha ou tempo esgotado: resposta "indisponível", sem cache.
- Limite de taxa por IP no endpoint (proposta: 10 por minuto). Valor final na #90.

```
GET https://rdap.registro.br/domain/<nome>.com.br
200 -> ocupado
404 -> disponível (sujeito às regras de registro)
outro código, erro de rede ou > 5 s -> indisponível
```

## Justificativa

- RDAP é público, sem contrato e com resposta estruturada. Serve já no mvp.
- A consulta pela API esconde o provedor da landing: trocar a fonte depois (Opção 3) não muda o front.
- O cache e o limite de taxa protegem o Registro.br de excesso de consultas e a API de abuso.
- Validar antes de montar a URL, não seguir redirecionamento e limitar o tamanho impedem que um nome forjado leve a API a outro destino (SSRF) ou a ler uma resposta enorme.
- WHOIS é mais frágil de interpretar e não traz vantagem sobre o RDAP.

## Consequências

- 404 no RDAP indica "não encontrado", não garante que o registro seja possível (nome reservado ou em processo de liberação). A landing mostra "disponível" com o aviso de registro manual (E1-H2), e a equipe confirma no registro (E4-H4).
- Dependência de um serviço externo sem acordo de nível de serviço. A resposta "indisponível" cobre a falha.
- Os limites de consulta do Registro.br precisam ser conferidos na #90; se forem baixos, aumentar o cache.
- Aceitar outros TLDs exige nova revisão deste ADR e do checkout.

## Revisões

- 2026-09-25: criação (CIT-47).
- 2026-09-25: ajustes da revisão (CIT-47).
- Revisão prevista pela #48 (PoC Skymail): trocar para a Opção 3 se a Skymail ou um revendedor oferecer consulta e registro.
- Revisão prevista pela #90: regras de nome, limite de taxa e duração do cache.
- 2026-09-26: aceito pelo responsável (CIT-47). Itens em "Decisões em aberto" do README e revisões previstas pela #48 continuam valendo.
