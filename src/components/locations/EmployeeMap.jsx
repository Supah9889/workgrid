import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createEmpIcon(name) {
  const initials = (name || '?')[0].toUpperCase();
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;font-family:Inter,sans-serif;">${initials}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    className: '',
  });
}

export default function EmployeeMap({ locationRecords, clockedInRecords, tasksByEmployee }) {
  const [center, setCenter] = useState([40.7128, -74.0060]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (locationRecords.length > 0) {
      setCenter([locationRecords[0].latitude, locationRecords[0].longitude]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  if (!mounted) return null;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '480px', width: '100%', borderRadius: '12px' }}
      key={center.toString()}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locationRecords.map(loc => {
        const clockRec = clockedInRecords.find(r => r.employee_email === loc.employee_email);
        const tasks = tasksByEmployee?.[loc.employee_email] || [];
        const lastUpdated = loc.updated_at ? formatDistanceToNow(new Date(loc.updated_at), { addSuffix: true }) : 'Unknown';

        return (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={createEmpIcon(loc.employee_name)}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>{loc.employee_name}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>Updated {lastUpdated}</p>
                {clockRec && (
                  <p style={{ fontSize: '12px', color: '#059669', margin: '0 0 6px' }}>
                    Clocked in since {new Date(clockRec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {tasks.length > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '6px', marginTop: '4px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Today's Tasks</p>
                    {tasks.slice(0, 3).map(t => (
                      <p key={t.id} style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px' }}>• {t.title}</p>
                    ))}
                    {tasks.length > 3 && <p style={{ fontSize: '11px', color: '#9ca3af' }}>+{tasks.length - 3} more</p>}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}