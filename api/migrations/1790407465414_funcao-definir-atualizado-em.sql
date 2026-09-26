-- Up Migration
-- Função de trigger para manter "atualizado_em" (UTC) nas tabelas que mudam
-- (anexo modelo-de-dados do ADR 0004).
CREATE FUNCTION definir_atualizado_em() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Down Migration
DROP FUNCTION definir_atualizado_em();
