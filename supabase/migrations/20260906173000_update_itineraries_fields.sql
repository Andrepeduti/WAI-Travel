ALTER TABLE itineraries 
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS main_tag,
ADD COLUMN status text DEFAULT 'draft',
ADD COLUMN is_flexible boolean DEFAULT false,
ADD COLUMN duration_days integer,
ADD COLUMN travel_month text;
