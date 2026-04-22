import { ClipboardList } from 'lucide-react';

export default function TaskBoard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Task Board</h1>
        <p className="text-muted-foreground mt-1">Manage and organize team tasks</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <ClipboardList className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Task Board</h2>
        <p className="text-muted-foreground max-w-md">
          The full task management board with drag-and-drop columns is coming soon.
        </p>
      </div>
    </div>
  );
}