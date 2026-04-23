import { base44 } from '@/api/base44Client';

export async function logActivity(event_type, description, actorEmail, actorName, opts = {}) {
  try {
    await base44.entities.ActivityFeed.create({
      event_type,
      description,
      actor_email: actorEmail || '',
      actor_name: actorName || actorEmail || '',
      entity_id: opts.entity_id || '',
      entity_type: opts.entity_type || '',
      metadata: opts.metadata || {},
    });
  } catch (e) {
    // Non-critical, don't throw
  }
}