import { useNavigate } from 'react-router-dom';

export default function LiveSummaryBar({ employees, clockedInCount, tasks, openClockCount }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.created_date?.startsWith(today));
  const pending = todayTasks.filter(t => t.status === 'pending').length;
  const inProgress = todayTasks.filter(t => t.status === 'in_progress').length;
  const complete = todayTasks.filter(t => t.status === 'complete').length;
  const unassigned = todayTasks.filter(t => !t.assigned_employee).length;

  const items = [
    {
      label: 'Employees',
      value: employees,
      color: 'text-foreground',
      bg: '',
    },
    {
      label: 'Clocked In',
      value: clockedInCount,
      dot: true,
      dotColor: 'bg-emerald-500',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border border-emerald-200',
    },
    {
      label: 'Tasks Today',
      value: todayTasks.length,
      color: 'text-foreground',
      bg: '',
    },
    {
      label: 'Pending',
      value: pending,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border border-yellow-200',
    },
    {
      label: 'In Progress',
      value: inProgress,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-200',
    },
    {
      label: 'Complete',
      value: complete,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border border-emerald-200',
    },
    {
      label: 'Unassigned',
      value: unassigned,
      color: unassigned > 0 ? 'text-orange-600' : 'text-muted-foreground',
      bg: unassigned > 0 ? 'bg-orange-50 border border-orange-200 cursor-pointer hover:bg-orange-100' : '',
      onClick: unassigned > 0 ? () => navigate('/tasks') : undefined,
    },
    {
      label: 'Open Clocks',
      value: openClockCount,
      color: openClockCount > 0 ? 'text-red-600' : 'text-muted-foreground',
      bg: openClockCount > 0 ? 'bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100' : '',
      onClick: openClockCount > 0 ? () => navigate('/clock-records') : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
      {items.map((item) => (
        <div
          key={item.label}
          onClick={item.onClick}
          className={`rounded-lg px-3 py-2.5 ${item.bg} ${item.onClick ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            {item.dot && <span className={`w-2 h-2 rounded-full ${item.dotColor} animate-pulse`} />}
            <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
}