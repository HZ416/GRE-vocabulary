ALTER TABLE app_settings
ADD COLUMN interface_language TEXT NOT NULL DEFAULT 'en'
CHECK (interface_language IN ('en', 'zh'));
