export const DEFAULT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const mapTileConfig = {
  url: import.meta.env.VITE_MAP_TILE_URL || DEFAULT_TILE_URL,
  attribution: import.meta.env.VITE_MAP_TILE_ATTRIBUTION || DEFAULT_TILE_ATTRIBUTION,
  subdomains: import.meta.env.VITE_MAP_TILE_SUBDOMAINS || 'abcd',
  maxZoom: Number(import.meta.env.VITE_MAP_TILE_MAX_ZOOM || 19),
};
