-- Migracion: dar prioridad visual a los peces con imagen.
-- Crea una columna generada 'tiene_imagen' y un indice para ordenar
-- los peces sin referencia visual al final del listado.
-- Ejecutar UNA vez en Supabase SQL Editor.
-- Es idempotente: si ya existe, no hace nada.

ALTER TABLE peces
ADD COLUMN IF NOT EXISTS tiene_imagen boolean
GENERATED ALWAYS AS (imagen_url IS NOT NULL AND imagen_url <> '') STORED;

CREATE INDEX IF NOT EXISTS peces_tiene_imagen_idx ON peces (tiene_imagen);
