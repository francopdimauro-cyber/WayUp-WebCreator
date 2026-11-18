-- Aplicada a mano el 2026-11-18 en wayup-studio-preview-projects (la tabla d1_migrations está vacía: no aplicar migraciones en bloque).
-- Límite de mensajes por visitante y día sin el CHECK (1..20) de per_visitor_limit. Añadir una columna no toca datos existentes.
ALTER TABLE studio_public_chats ADD COLUMN visitor_limit INTEGER;
UPDATE studio_public_chats SET visitor_limit=50;
