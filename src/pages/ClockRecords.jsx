import { Clock } from 'lucide-react';

export default function ClockRecords() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Clock Records</h1>
        <p className="text-muted-foreground mt-1">Employee clock in/out history</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Clock Records</h2>
        <p className="text-muted-foreground max-w-md">
          The full time tracking dashboard is coming soon.
        </p>
      </div>
    </div>
  );
}