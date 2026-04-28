import { AlertCircle } from 'lucide-react';

export default function MapTileErrorBanner() {
  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-[1000] rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>Map background tiles could not load. Locations and routes may still be available.</span>
      </div>
    </div>
  );
}
