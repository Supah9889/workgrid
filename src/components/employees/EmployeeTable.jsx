import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, ShieldCheck, Shield, UserCircle, UserX, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ROLE_BADGES = {
  super_admin: { label: 'Super Admin', className: 'bg-foreground text-background' },
  operator: { label: 'Operator', className: 'bg-primary/10 text-primary border-0' },
  employee: { label: 'Employee', className: 'bg-secondary text-secondary-foreground' },
};

const ROLE_ICONS = {
  super_admin: ShieldCheck,
  operator: Shield,
  employee: UserCircle,
};

export default function EmployeeTable({ users, onChangeRole, onDeactivate, onActivate }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date Added</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                No employees found
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => {
              const roleBadge = ROLE_BADGES[u.role] || ROLE_BADGES.employee;
              const RoleIcon = ROLE_ICONS[u.role] || UserCircle;
              const isInactive = u.status === 'inactive';
              return (
                <TableRow key={u.id} className={isInactive ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{u.full_name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={roleBadge.className}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {roleBadge.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isInactive ? 'outline' : 'secondary'} className={isInactive ? 'text-destructive border-destructive/30' : 'bg-green-50 text-green-700 border-0'}>
                      {isInactive ? 'Inactive' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.created_date ? format(new Date(u.created_date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onChangeRole(u, 'super_admin')} disabled={u.role === 'super_admin'}>
                          <ShieldCheck className="w-4 h-4 mr-2" /> Promote to Super Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChangeRole(u, 'operator')} disabled={u.role === 'operator'}>
                          <Shield className="w-4 h-4 mr-2" /> Set as Operator
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChangeRole(u, 'employee')} disabled={u.role === 'employee'}>
                          <UserCircle className="w-4 h-4 mr-2" /> Set as Employee
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/employees/${u.id}`)}>
                          <ExternalLink className="w-4 h-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isInactive ? (
                          <DropdownMenuItem onClick={() => onActivate(u)}>
                            <ArrowUpDown className="w-4 h-4 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onDeactivate(u)} className="text-destructive focus:text-destructive">
                            <UserX className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}