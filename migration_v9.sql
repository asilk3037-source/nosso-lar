-- ══════════════════════════════════════════════════════════════
--  MIGRAÇÃO v9 — Separar quantidade em número + unidade
--  Execute no Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Adiciona novas colunas
ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS qty_num  NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qty_unit TEXT         DEFAULT 'unid';

-- 2. Migra dados da coluna antiga "quantity" (se existir)
--    Exemplos: "1 kg" → qty_num=1, qty_unit='kg'
--              "2 unid" → qty_num=2, qty_unit='unid'
--              "1/2 kg" → qty_num=0.5, qty_unit='kg'
UPDATE shopping_items SET
  qty_num  = CASE
    WHEN quantity ~ '^(\d+\.?\d*)\s+\w+$'
      THEN CAST(substring(quantity from '^(\d+\.?\d*)') AS NUMERIC)
    WHEN quantity ~ '^1/2\s+\w+$'
      THEN 0.5
    WHEN quantity ~ '^3/4\s+\w+$'
      THEN 0.75
    WHEN quantity ~ '^1/4\s+\w+$'
      THEN 0.25
    ELSE NULL
  END,
  qty_unit = CASE
    WHEN quantity ~ '\s+(kg|g|L|ml|pct|cx|lata|sac|fardo|unid|bandeja)$'
      THEN lower(substring(quantity from '\s+(\w+)$'))
    ELSE 'unid'
  END
WHERE quantity IS NOT NULL AND quantity != '';

-- 3. (Opcional) remove coluna antiga depois de verificar
-- ALTER TABLE shopping_items DROP COLUMN IF EXISTS quantity;
