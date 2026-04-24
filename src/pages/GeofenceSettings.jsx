import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Navigation, Save, Loader2, Radio } from 'lucide-react';

export default function GeofenceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settingsList = [], isLoading, isError } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const existing = settingsList[0] || null;

  const [form, setForm] = useState({
    geofence_enabled: false,
    geofence_lat: '',
    geofence_lng: '',
    geofence_radius: 0.5,
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        geofence_enabled: existing.geofence_enabled || false,
        geofence_lat: existing.geofence_lat != null ? String(existing.geofence_lat) : '',
        geofence_lng: existing.geofence_lng != null ? String(existing.geofence_lng) : '',
        geofence_radius: existing.geofence_radius || 0.5,
      });
    }
  }, [existing?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported by this browser', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('geofence_lat', String(pos.coords.latitude));
        set('geofence_lng', String(pos.coords.longitude));
        setLocating(false);
        toast({ title: 'Location captured' });
      },
      () => {
        setLocating(false);
        toast({ title: 'Could not get location. Check browser permissions.', variant: 'destructive' });
      },
      { timeout: 10000 }
    );
  };

  const handleSave = async () => {
    const lat = parseFloat(form.geofence_lat);
    const lng = parseFloat(form.geofence_lng);
    if (form.geofence_enabled && (isNaN(lat) || isNaN(lng))) {
      toast({ title: 'Enter valid coordinates to enable geofencing', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload = {
      geofence_enabled: form.geofence_enabled,
      geofence_lat: isNaN(lat) ? null : lat,
      geofence_lng: isNaN(lng) ? null : lng,
      geofence_radius: Number(form.geofence_radius),
    };

    try {
      if (existing?.id) {
        await base44.entities.AppSettings.update(existing.id, payload);
      } else {
        await base44.entities.AppSettings.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast({ title: 'Geofence settings saved' });
    } catch (e) {
      console.error('[GeofenceSettings] Save failed:', e);
      const description = e?.message?.toLowerCase().includes('network') || e?.message?.toLowerCase().includes('fetch')
        ? 'Network error — check your connection and try again.'
        : (e.message || 'Settings could not be saved. Please try again.');
      toast({ title: 'Failed to save settings', description, variant: 'destructive' });
    }
    setSaving(false);
  };

  const radiusFt = Math.round(form.geofence_radius * 5280);

  if (isLoading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-destructive font-medium">Failed to load data</p>
      <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Geofence Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Define the area employees must be in when clocking in or out.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Geofencing</p>
            <p className="text-sm text-muted-foreground mt-0.5">Flag punches that occur outside the radius</p>
          </div>
          <div
            onClick={() => set('geofence_enabled', !form.geofence_enabled)}
            className={`w-12 h-6 rounded-full cursor-pointer transition-all flex items-center px-1 ${
              form.geofence_enabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow" />
          </div>
        </div>

        <div className={`space-y-4 ${!form.geofence_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Location inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Geofence Center</label>
              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-500 transition-colors"
              >
                {locating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Navigation className="w-3.5 h-3.5" />}
                Use current location
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
                <Input
                  value={form.geofence_lat}
                  onChange={e => set('geofence_lat', e.target.value)}
                  placeholder="e.g. 33.7490"
                  type="number"
                  step="any"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
                <Input
                  value={form.geofence_lng}
                  onChange={e => set('geofence_lng', e.target.value)}
                  placeholder="e.g. -84.3880"
                  type="number"
                  step="any"
                />
              </div>
            </div>
          </div>

          {/* Radius slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Acceptable Radius</label>
              <span className="text-sm font-semibold text-blue-600">
                {form.geofence_radius} mi · {radiusFt.toLocaleString()} ft
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={form.geofence_radius}
              onChange={e => set('geofence_radius', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0.1 mi</span>
              <span>5 mi</span>
            </div>
          </div>

          {/* Visual preview */}
          {form.geofence_lat && form.geofence_lng && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    Geofence Preview
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Center: {parseFloat(form.geofence_lat).toFixed(5)}, {parseFloat(form.geofence_lng).toFixed(5)}
                  </p>
                  <p className="text-xs text-blue-600">
                    Radius: {form.geofence_radius} miles ({radiusFt.toLocaleString()} ft)
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Employees must punch in within {form.geofence_radius} miles of this point.
                    Punches outside this area will be flagged.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}