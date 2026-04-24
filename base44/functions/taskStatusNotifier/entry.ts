import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Only care about update events
    if (event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    const task = data;
    const status = task?.status;

    // Only fire for en_route or delivered
    if (status !== 'en_route' && status !== 'delivered') {
      return Response.json({ skipped: true, reason: 'status not en_route or delivered' });
    }

    const customerEmail = task.customer_email;
    const taskTitle = task.title || 'Your delivery';
    const partDesc = task.part_description ? ` (${task.part_description})` : '';
    const address = task.delivery_address || '';
    const requestedBy = task.requested_by || '';

    const results = [];

    // 1. Email the customer/stakeholder if an email is on file
    if (customerEmail) {
      let subject, body;

      if (status === 'en_route') {
        subject = `Your delivery is on the way!`;
        body = `Hi ${requestedBy || 'there'},

Great news! Your delivery is now en route.

Order: ${taskTitle}${partDesc}
Destination: ${address}

Our driver is heading your way. You'll receive another update once the delivery is complete.

Thank you!`;
      } else if (status === 'delivered') {
        subject = `Your delivery has been completed ✓`;
        body = `Hi ${requestedBy || 'there'},

Your delivery has been successfully completed!

Order: ${taskTitle}${partDesc}
Delivered to: ${address}

If you have any questions or concerns, please don't hesitate to reach out.

Thank you for your business!`;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: customerEmail,
        subject,
        body,
      });

      results.push({ sent_to: customerEmail, status });
    }

    // 2. Notify admins / operators via in-app notification
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u =>
      u.role === 'super_admin' || u.role === 'operator' || u.role === 'owner'
    );

    const statusLabel = status === 'en_route' ? 'En Route' : 'Delivered';
    for (const admin of admins) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        title: `Task ${statusLabel}: ${taskTitle}`,
        message: `${taskTitle}${partDesc} is now ${statusLabel}${address ? ` → ${address}` : ''}.`,
        type: status === 'delivered' ? 'success' : 'info',
        read: false,
      });
    }

    return Response.json({ ok: true, results, admins_notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});