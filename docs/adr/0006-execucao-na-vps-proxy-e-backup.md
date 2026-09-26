# 0006. Execução na VPS, proxy reverso com HTTPS e backup

Status: proposto
Data: 2026-09-25

## Contexto

Decidido pelo responsável em 2026-09-25: API e PostgreSQL na mesma VPS da CIT (`<host-da-vps>`), com o backup fora dela. Falta decidir como os processos rodam, como o HTTPS é servido e como o backup é feito. O SLA é 99,5% de disponibilidade mensal (briefing 6.4), e uma única VPS concentra API, banco e — pela decisão do ADR 0005 — também o Redis.

**Placeholders obrigatórios:** este ADR e qualquer outro documento em `docs/` nunca citam host, IP, porta ou usuário reais da VPS. Usar sempre `<host-da-vps>`, `<porta-ssh>`, `<usuario-de-deploy>` (ver regra em `docs/adr/README.md`).

## Opções consideradas

### Opção 1: Processos `systemd` + Caddy
API e workers da fila como serviços `systemd`, rodando com usuário próprio sem login; proxy reverso Caddy na frente, com HTTPS automático via Let's Encrypt.

### Opção 2: Docker Compose
API, banco, Redis e proxy como contêineres orquestrados por `docker-compose.yml` na VPS.

### Opção 3: PM2 + Nginx + certbot
Processos Node.js gerenciados pelo PM2, atrás de Nginx com certificado emitido e renovado pelo certbot.

## Decisão

API, PostgreSQL e Redis na mesma VPS; backup fora dela (decidido). Processos `systemd` com usuário próprio sem login; proxy reverso Caddy com HTTPS automático; PostgreSQL e Redis só em interface local; backup diário com `pg_dump` cifrado enviado a um armazenamento de objetos externo, com 30 dias de retenção (proposto).

## Justificativa

- **`systemd` sem dependência extra:** a VPS já roda Linux com `systemd`; não é preciso instalar e manter Docker ou PM2 como camada adicional. Um serviço por processo (API, worker da fila) com `Restart=on-failure` cobre reinício automático sem orquestrador.
- **Caddy com HTTPS automático:** Caddy renova certificado Let's Encrypt sozinho, sem o par certbot + configuração manual de renovação do Nginx, reduzindo um ponto de falha operacional (certificado vencido).
- **Interface local para banco e fila:** PostgreSQL e Redis expostos só em `127.0.0.1` eliminam a superfície de ataque de uma porta de banco aberta à internet, sem depender de regra de firewall como única proteção (defesa em profundidade, ver também ADR 0013).
- **Backup fora da VPS, cifrado:** um `pg_dump` que fica na mesma VPS não sobrevive à perda da própria VPS; enviar a um armazenamento de objetos externo cifrado atende à exigência de recuperação de desastre do briefing (6.1) e evita depender de um provedor único de VPS. Docker Compose ou PM2 + Nginx resolveriam o mesmo problema, mas adicionam uma camada de orquestração ou de renovação manual de certificado sem ganho claro no porte deste projeto.

Exemplo ilustrativo (unidade `systemd`):

```ini
[Unit]
Description=CITMail API
After=network.target

[Service]
User=<usuario-de-deploy>
ExecStart=/usr/bin/node api/src/index.js
Restart=on-failure
EnvironmentFile=/etc/citmail/api.env

[Install]
WantedBy=multi-user.target
```

## Consequências

- **Ponto único de falha:** API, banco e fila na mesma VPS tornam essa VPS o único ponto de falha diante do SLA de 99,5% (≈ 3,6 h de indisponibilidade tolerada por mês). Aceito no MVP; mitigado por monitoramento (E2-H11) e por backup com restauração testada (E2-H7), com tempo de recuperação alvo a definir na E2-H7.
- O arquivo de ambiente (`/etc/citmail/api.env` no exemplo acima) guarda os segredos com permissão `600`, nunca no repositório (regra da CIT-46).
- O destino do armazenamento externo de backup (provedor) é decidido na E2-H7; este ADR só fixa o tipo (armazenamento de objetos, fora da VPS, cifrado, 30 dias).
- A porta SSH, o usuário de deploy e o host da VPS ficam fora deste repositório público; documentados só no ambiente de CI (`SSH_HOST`, `SSH_PORT`, `SSH_USER` do `publicar-homologacao.yml`) e no gerenciador de segredos da equipe.

## Revisões

- 2026-09-25: criação (CIT-47).
