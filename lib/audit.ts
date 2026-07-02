/**
 * Audit log — security trail of who did what, when.
 *
 * Fire-and-forget: writing the log must NEVER break or slow down the
 * actual request, so failures are only logged to the console.
 */
import { prisma } from './prisma';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_changed'
  | 'student.create'
  | 'student.update'
  | 'student.delete'
  | 'student.bulk_import'
  | 'student.account_created'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'attendance.manual_mark'
  | 'attendance.finalize';

export interface AuditEntry {
  action: AuditAction;
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  ip?: string | null;
  details?: Record<string, unknown> | null;
}

/** Write an audit entry without blocking the caller. */
export function audit(entry: AuditEntry): void {
  prisma.auditLog
    .create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        targetId: entry.targetId ?? null,
        ip: entry.ip ?? null,
        details: entry.details ? (entry.details as object) : undefined,
      },
    })
    .catch((err: unknown) => {
      console.error('audit log write failed:', err);
    });
}
