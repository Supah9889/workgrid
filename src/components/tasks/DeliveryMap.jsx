import { useEffect, useState, useRef } from 'react';
import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2, AlertCircle, Navigation } from 'lucide-react';
import AppTileLayer from '@/components/maps/AppTileLayer';
import MapTileErrorBanner from '@/components/maps/MapTileErrorBanner';

// Fix leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS = {
  pending: '#6366f1',
  picked_up: '#f59e0b',
  en_route: '#3b82f6',
  delivered: '#10b981',
};

// Destination pin (teardrop shape)
function makeDestinationIcon(status) {
  const color = STATUS_COLORS[status] || '#6366f1';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z"
      fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [24, 32], iconAnchor: [12, 32], popupAnchor: [0, -34] });
}

// Live driver icon — pulsing circle
function makeDriverIcon(name) {
  const initial = (name || '?')[0].toUpperCase();
  const html = `
    <div style="position:relative;width:36px;height:36px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.25;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:#3b82f6;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${initial}</div>
    </div>
    <style>@keyframes ping{75%,100%{transform:scale(1.8);opacity:0;}}</style>`;
  return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] });
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  return null;
}

// Auto-fit map bounds when markers change
function BoundsController({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 13); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
  }, [points.map(p => p.join(',')).join('|')]);
  return null;
}

export default function DeliveryMap({ tasks }) {
  const [destMarkers, setDestMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodeErrors, setGeocodeErrors] = useState(0);
  const [tileError, setTileError] = useState(false);
  const geocacheRef = useRef({});

  const activeTasks = tasks.filter(t =>
    (t.status === 'pending' || t.status === 'picked_up' || t.status === 'en_route') &&
    t.delivery_address
  );

  const liveDrivers = tasks.filter(t =>
    t.status === 'en_route' &&
    t.employee_lat != null && t.employee_lng != null
  );

  // Geocode destination addresses (with local cache + rate-limiting)
  useEffect(() => {
    if (activeTasks.length === 0) { setLoading(false); setDestMarkers([]); return; }

    let cancelled = false;
    setLoading(true);
    setGeocodeErrors(0);

    const resolve = async () => {
      const results = [];
      let errors = 0;
      for (const task of activeTasks) {
        if (cancelled) return;
        const cacheKey = task.delivery_address;
        let coords = geocacheRef.current[cacheKey];
        if (!coords) {
          coords = await geocodeAddress(task.delivery_address);
          if (coords) geocacheRef.current[cacheKey] = coords;
          await new Promise(r => setTimeout(r, 1100)); // Nominatim rate-limit
        }
        if (coords) results.push({ task, ...coords });
        else errors++;
      }
      if (!cancelled) {
        setDestMarkers(results);
        setGeocodeErrors(errors);
        setLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [activeTasks.map(t => t.id + t.delivery_address).join(',')]);

  // All plotted points (destinations + live drivers) for bounds fitting
  const allPoints = [
    ...destMarkers.map(m => [m.lat, m.lng]),
    ...liveDrivers.map(d => [d.employee_lat, d.employee_lng]),
  ];

  const defaultCenter = [37.0902, -95.7129];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border flex-wrap">
        {[
          { key: 'pending',   label: 'Pending'   },
          { key: 'picked_up', label: 'Picked Up' },
          { key: 'en_route',  label: 'En Route'  },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[key] }} />
            {label}
          </div>
        ))}
        {liveDrivers.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <Navigation className="w-3 h-3" />
            {liveDrivers.length} live driver{liveDrivers.length > 1 ? 's' : ''}
          </div>
        )}
        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {activeTasks.length} active deliveries
          {geocodeErrors > 0 && (
            <span className="text-amber-500 flex items-center gap-1 ml-2">
              <AlertCircle className="w-3 h-3" /> {geocodeErrors} not found
            </span>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-[460px] bg-muted/20 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Geocoding delivery addresses…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && activeTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[460px] bg-muted/10 gap-2">
          <MapPin className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No active deliveries to display</p>
          <p className="text-sm text-muted-foreground">Pending, Picked Up, and En Route tasks with addresses will appear here.</p>
        </div>
      )}

      {/* Map */}
      {!loading && activeTasks.length > 0 && (
        <div className="relative">
          {tileError && <MapTileErrorBanner />}
        <MapContainer
          center={allPoints.length > 0 ? allPoints[0] : defaultCenter}
          zoom={10}
          style={{ height: '460px', width: '100%' }}
        >
          <AppTileLayer onTileError={() => setTileError(true)} />
          <BoundsController points={allPoints} />

          {/* Destination markers */}
          {destMarkers.map(({ task, lat, lng }) => (
            <Marker key={`dest-${task.id}`} position={[lat, lng]} icon={makeDestinationIcon(task.status)}>
              <Popup>
                <div className="text-sm space-y-1 min-w-[190px]">
                  <p className="font-semibold leading-snug">{task.title}</p>
                  {task.part_description && <p className="text-gray-500 text-xs">{task.part_description}</p>}
                  <div className="flex gap-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      task.status === 'pending'   ? 'bg-indigo-100 text-indigo-700' :
                      task.status === 'picked_up' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                    }`}>
                      {task.status === 'picked_up' ? 'Picked Up' : task.status === 'en_route' ? 'En Route' : 'Pending'}
                    </span>
                    {task.priority && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{task.priority}</span>
                    )}
                  </div>
                  {task.delivery_address && <p className="text-xs text-gray-500">📍 {task.delivery_address}</p>}
                  {task.assigned_employee_name && <p className="text-xs text-gray-600">👤 {task.assigned_employee_name}</p>}
                  {task.requested_by && <p className="text-xs text-gray-500">🏢 {task.requested_by}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Live driver markers + route lines */}
          {liveDrivers.map(task => {
            const driverPos = [task.employee_lat, task.employee_lng];
            const destMarker = destMarkers.find(m => m.task.id === task.id);
            const destPos = destMarker ? [destMarker.lat, destMarker.lng] : null;
            const staleMins = task.employee_location_updated_at
              ? Math.round((Date.now() - new Date(task.employee_location_updated_at)) / 60000)
              : null;

            return (
              <span key={`driver-${task.id}`}>
                {/* Dashed line from driver → destination */}
                {destPos && (
                  <Polyline
                    positions={[driverPos, destPos]}
                    pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '6 6', opacity: 0.7 }}
                  />
                )}
                {/* Driver marker */}
                <Marker position={driverPos} icon={makeDriverIcon(task.assigned_employee_name)}>
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[170px]">
                      <p className="font-semibold text-blue-600">🚗 En Route</p>
                      <p className="font-medium">{task.assigned_employee_name || task.assigned_employee}</p>
                      <p className="text-gray-600 text-xs">Delivering: {task.title}</p>
                      {staleMins !== null && (
                        <p className="text-gray-400 text-xs">
                          GPS updated {staleMins < 1 ? 'just now' : `${staleMins}m ago`}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </span>
            );
          })}
        </MapContainer>
        </div>
      )}
    </div>
  );
}
