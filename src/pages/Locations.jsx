import { MapPin } from 'lucide-react';

export default function Locations() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Employee Locations</h1>
        <p className="text-muted-foreground mt-1">Track real-time employee positions</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <MapPin className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Location Tracking</h2>
        <p className="text-muted-foreground max-w-md">
          The live employee location map is coming soon.
        </p>
      </div>
    </div>
  );
}