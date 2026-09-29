-- add_lat_lng_to_cities.sql
-- Adiciona coordenadas na tabela cities para servir de cache primário da cidade
-- e evitar fetch redundante no Google Places

ALTER TABLE public.cities 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;
