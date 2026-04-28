import { base44 } from '@/api/base44Client';

async function getAdminUsers() {
  try {
    const profiles = await base44.entities.EmployeeProfile.list();
    return profiles.filter(u => u.role === 'super_admin' || u.role === 'operator' || u.role === 'owner');
  } catch (e) {
    console.warn('[notificationService] Could not fetch admin users:', e);
    return [];
  }
}

async function createNotification(recipientEmail, title, message, type) {
  if (!recipientEmail) return;
  try {
    await base44.entities.Notification.create({
      recipient_email: recipientEmail,
      title,
      message,
      type: type || 'info',
      read: false,
    });
  } catch (e) {
    console.warn('[notificationService] Failed to create notification:', e);
  }
}

export async function notifyTaskAssigned(task, employeeEmail) {
  await createNotification(employeeEmail, 'New Task Assigned', `You have been assigned: ${task.title}`, 'task');
}

export async function notifyTaskReassigned(task, oldEmail, newEmail) {
  await createNotification(newEmail, 'Task Assigned to You', `You have been assigned: ${task.title}`, 'task');
  if (oldEmail) await createNotification(oldEmail, 'Task Reassigned', `${task.title} has been reassigned`, 'task');
}

export async function notifyTaskStatusChanged(task, newStatus, adminEmail) {
  const admins = await getAdminUsers();
  for (const admin of admins) {
    await createNotification(admin.email, 'Task Status Updated', `${task.title} is now ${newStatus.replace(/_/g, ' ')}`, 'task');
  }
}

export async function notifyOutOfBoundsPunch(employee, punchType, distance) {
  const admins = await getAdminUsers();
  for (const admin of admins) {
    await createNotification(admin.email, '⚠️ Out of Bounds Punch', `${employee.full_name || employee.email} punched ${punchType} ${distance.toFixed(2)} miles from the geofence`, 'alert');
  }
}

export async function notifyClockIn(employee) {
  const admins = await getAdminUsers();
  for (const admin of admins) {
    await createNotification(admin.email, 'Employee Clocked In', `${employee.full_name || employee.email} has clocked in`, 'clock');
  }
}

export async function notifyClockOut(employee, totalHours) {
  const admins = await getAdminUsers();
  for (const admin of admins) {
    await createNotification(admin.email, 'Employee Clocked Out', `${employee.full_name || employee.email} clocked out after ${totalHours}h`, 'clock');
  }
}

export async function notifyNewMessage(senderName, recipientEmail) {
  await createNotification(recipientEmail, 'New Message', `${senderName} sent you a message`, 'chat');
}