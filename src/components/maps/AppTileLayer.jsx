import { TileLayer } from 'react-leaflet';
import { mapTileConfig } from '@/lib/mapTiles';

export default function AppTileLayer({ onTileError }) {
  return (
    <TileLayer
      attribution={mapTileConfig.attribution}
      url={mapTileConfig.url}
      subdomains={mapTileConfig.subdomains}
      maxZoom={mapTileConfig.maxZoom}
      eventHandlers={{
        tileerror: () => onTileError?.(),
      }}
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
