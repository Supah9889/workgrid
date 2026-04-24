import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

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

function makeIcon(status) {
  const color = STATUS_COLORS[status] || '#6366f1';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
  });
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  return null;
}

export default function DeliveryMap({ tasks }) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodeErrors, setGeocodeErrors] = useState(0);

  const activeTasks = tasks.filter(t =>
    (t.status === 'pending' || t.status === 'picked_up' || t.status === 'en_route') &&
    t.delivery_address
  );

  useEffect(() => {
    if (activeTasks.length === 0) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setGeocodeErrors(0);

    const resolve = async () => {
      const results = [];
      let errors = 0;
      for (const task of activeTasks) {
        if (cancelled) return;
        const coords = await geocodeAddress(task.delivery_address);
        if (coords) {
          results.push({ task, ...coords });
        } else {
          errors++;
        }
        // Rate-limit Nominatim (1 req/sec)
        await new Promise(r => setTimeout(r, 1100));
      }
      if (!cancelled) {
        setMarkers(results);
        setGeocodeErrors(errors);
        setLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [activeTasks.map(t => t.id + t.delivery_address).join(',')]);

  const center = markers.length > 0
    ? [markers.reduce((s, m) => s + m.lat, 0) / markers.length,
       markers.reduce((s, m) => s + m.lng, 0) / markers.length]
    : [37.0902, -95.7129]; // USA center fallback

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border flex-wrap">
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'picked_up', label: 'Picked Up' },
          { key: 'en_route', label: 'En Route' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[key] }} />
            {label}
          </div>
        ))}
        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {activeTasks.length} active deliveries
          {geocodeErrors > 0 && (
            <span className="text-amber-500 flex items-center gap-1 ml-2">
              <AlertCircle className="w-3 h-3" /> {geocodeErrors} address{geocodeErrors > 1 ? 'es' : ''} not found
            </span>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center h-[420px] bg-muted/20 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Geocoding delivery addresses…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && activeTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[420px] bg-muted/10 gap-2">
          <MapPin className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No active deliveries to display</p>
          <p className="text-sm text-muted-foreground">Pending, Picked Up, and En Route tasks will appear here.</p>
        </div>
      )}

      {/* Map */}
      {!loading && activeTasks.length > 0 && (
        <MapContainer
          center={center}
          zoom={markers.length === 1 ? 13 : 9}
          style={{ height: '420px', width: '100%' }}
          key={center.join(',')}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map(({ task, lat, lng }) => (
            <Marker key={task.id} position={[lat, lng]} icon={makeIcon(task.status)}>
              <Popup>
                <div className="text-sm space-y-1 min-w-[180px]">
                  <p className="font-semibold leading-snug">{task.title}</p>
                  {task.part_description && (
                    <p className="text-gray-500 text-xs">{task.part_description}</p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      task.status === 'pending' ? 'bg-indigo-100 text-indigo-700' :
                      task.status === 'picked_up' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {task.status === 'picked_up' ? 'Picked Up' : task.status === 'en_route' ? 'En Route' : 'Pending'}
                    </span>
                    {task.priority && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{task.priority}</span>
                    )}
                  </div>
                  {task.delivery_address && (
                    <p className="text-xs text-gray-500">{task.delivery_address}</p>
                  )}
                  {task.assigned_employee_name && (
                    <p className="text-xs text-gray-600">👤 {task.assigned_employee_name}</p>
                  )}
                  {task.requested_by && (
                    <p className="text-xs text-gray-500">🏢 {task.requested_by}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}