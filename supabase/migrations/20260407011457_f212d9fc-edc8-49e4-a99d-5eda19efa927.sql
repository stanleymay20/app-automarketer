UPDATE content SET platform = LOWER(platform) WHERE platform != LOWER(platform);
UPDATE content SET platform = 'x' WHERE platform IN ('twitter', 'x (twitter)');
UPDATE platform_connections SET platform = LOWER(platform) WHERE platform != LOWER(platform);