export default function TaskSummaryBar({ tasks = [], employees = [] }) {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const complete = tasks.filter(t => t.status === 'complete').length;

  const employeeEmails = [...new Set(tasks.map(t => t.assigned_employee).filter(Boolean))];

  return (
    <div className="flex flex-wrap gap-4 items-center p-4 bg-card border rounded-xl">
      <div className="flex gap-4 text-sm font-medium">
        <span className="text-muted-foreground">Total: <span className="text-foreground">{total}</span></span>
        <span className="text-muted-foreground">Pending: <span className="text-slate-600">{pending}</span></span>
        <span className="text-muted-foreground">In Progress: <span className="text-blue-600">{inProgress}</span></span>
        <span className="text-muted-foreground">Complete: <span className="text-green-600">{complete}</span></span>
      </div>

      {employeeEmails.length > 0 && (
        <div className="flex flex-wrap gap-3 ml-auto">
          {employeeEmails.map(email => {
            const emp = employees.find(e => e.email === email);
            const name = emp?.full_name || email.split('@')[0];
            const empTasks = tasks.filter(t => t.assigned_employee === email);
            const empDone = empTasks.filter(t => t.status === 'complete').length;
            return (
              <div key={email} className="text-xs bg-muted rounded-md px-2.5 py-1">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground ml-1.5">{empDone}/{empTasks.length}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}