// Guarda de rede (CA6): carregada com `--import ./test/sem-rede.js` antes da
// suíte. Substitui `net.Socket.prototype.connect` para que qualquer conexão a
// host fora de `127.0.0.1`, `::1` ou `localhost` falhe na hora, antes de
// qualquer resolução de DNS, com o erro `ERR_REDE_BLOQUEADA`. Isso cobre tanto
// `net.connect` direto quanto `fetch`/`http`/clientes que usam sockets TCP por
// baixo. Conexões ao Postgres de teste no loopback continuam funcionando.

import net from 'node:net';

const HOSTS_PERMITIDOS = new Set(['127.0.0.1', '::1', 'localhost']);

function extrairHost(args) {
  let [primeiroArgumento, segundoArgumento] = args;

  // `Socket.prototype.connect` às vezes é chamado já com os argumentos
  // normalizados internamente pelo `net`: um único array `[opcoes, callback]`
  // (é o que `net.connect(porta, host)` produz por baixo). Desembrulha até
  // achar a forma real (objeto de opções, ou porta/host soltos).
  while (Array.isArray(primeiroArgumento)) {
    [primeiroArgumento, segundoArgumento] = primeiroArgumento;
  }

  if (typeof primeiroArgumento === 'object' && primeiroArgumento !== null) {
    return primeiroArgumento.host ?? primeiroArgumento.path ?? 'localhost';
  }

  if (typeof segundoArgumento === 'string') {
    return segundoArgumento;
  }

  // `connect(path)` (socket Unix) ou porta sem host explícito: trata como local.
  return 'localhost';
}

const conectarOriginal = net.Socket.prototype.connect;

net.Socket.prototype.connect = function guardaDeRede(...args) {
  const host = extrairHost(args);

  if (!HOSTS_PERMITIDOS.has(host)) {
    const erro = new Error(
      `sem-rede: conexão bloqueada para o host "${host}" durante os testes da API.`,
    );
    erro.code = 'ERR_REDE_BLOQUEADA';

    queueMicrotask(() => this.emit('error', erro));

    return this;
  }

  return conectarOriginal.apply(this, args);
};
