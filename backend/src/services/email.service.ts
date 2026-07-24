import { pool } from "../db";
import { transporter } from "../utils/mailer";

export type EmailSummary = { sent: number; skipped: number; failed: number };

// Idempotency rule (README §2.5): a pair already marked 'sent' is skipped; any
// other state (including a prior 'failed') is (re)sent.
export function shouldSendEmail(existingStatus?: string | null): boolean {
  return existingStatus !== "sent";
}

async function recordSend(
  positionId: string,
  candidateId: number,
  status: "sent" | "failed",
  error: string | null
) {
  // Upsert on the UNIQUE(position_id, candidate_id) ledger so a retry updates
  // the existing row and a race can never create a duplicate.
  await pool.query(
    `
    INSERT INTO email_sends (position_id, candidate_id, status, error, sent_at)
    VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'sent' THEN now() ELSE NULL END)
    ON CONFLICT (position_id, candidate_id) DO UPDATE SET
      status  = EXCLUDED.status,
      error   = EXCLUDED.error,
      sent_at = CASE WHEN EXCLUDED.status = 'sent' THEN now() ELSE email_sends.sent_at END
    `,
    [positionId, candidateId, status, error]
  );
}

// Send to N recipients for a position. Idempotent: already-sent pairs are
// skipped; failures are recorded with a reason so a retry re-sends only those
// (README §2.5).
export async function sendBulkEmails(
  candidateIds: number[],
  positionId: string
): Promise<EmailSummary> {
  const summary: EmailSummary = { sent: 0, skipped: 0, failed: 0 };

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    throw new Error("candidateIds must be a non-empty array");
  }
  if (!positionId) {
    throw new Error("positionId is required");
  }

  const positionResult = await pool.query(
    `SELECT * FROM positions WHERE id = $1`,
    [positionId]
  );
  if (positionResult.rowCount === 0) {
    throw new Error("Position not found");
  }
  const position = positionResult.rows[0];
  const requiredSkills = (position.required_skills || []).map((s: string) =>
    String(s).toLowerCase()
  );

  for (const candidateId of candidateIds) {
    try {
      const candidateResult = await pool.query(
        `SELECT * FROM candidates WHERE id = $1`,
        [candidateId]
      );
      if (candidateResult.rowCount === 0) {
        summary.failed++;
        continue;
      }
      const candidate = candidateResult.rows[0];

      // Atomically claim this (position, candidate) pair, so a concurrent send or
      // a rapid double-click can never both dispatch. A pair already 'sent' (or
      // mid-flight 'sending') yields 0 rows and is skipped; only new, 'failed', or
      // 'queued' pairs are claimed. This closes the check-then-send race that the
      // UNIQUE ledger alone (which dedups rows, not outbound mail) leaves open.
      const claim = await pool.query(
        `INSERT INTO email_sends (position_id, candidate_id, status)
         VALUES ($1, $2, 'sending')
         ON CONFLICT (position_id, candidate_id) DO UPDATE
           SET status = 'sending', error = NULL
           WHERE email_sends.status IN ('failed', 'queued')
         RETURNING id`,
        [positionId, candidateId]
      );
      if (claim.rowCount === 0) {
        summary.skipped++;
        continue;
      }

      // Personalize: first name (fallback "there"), matched skills, position.
      const firstName =
        String(candidate.name ?? "").trim().split(/\s+/)[0] || "there";
      const candidateSkills = (candidate.skills || []).map((s: string) =>
        String(s).toLowerCase()
      );
      const matched = requiredSkills.filter((s: string) =>
        candidateSkills.includes(s)
      );
      const skillLine = matched.length
        ? `Your ${matched.slice(0, 3).join(", ")} experience stood out for this role.`
        : `Your background looks like a strong fit for this role.`;

      try {
        await transporter.sendMail({
          from: "talentmatch@example.com",
          to: candidate.email,
          subject: `Opportunity - ${position.title}`,
          html: `
            <h2>Hello ${firstName}</h2>
            <p>We found a position that matches your profile: <strong>${position.title}</strong>.</p>
            <p>${skillLine}</p>
            <p>
              Location: ${position.location ?? "—"}<br/>
              Required experience: ${position.min_experience} years
            </p>
            <p>Regards,<br/>TalentMatch</p>
          `,
        });
      } catch (sendErr: any) {
        await recordSend(
          positionId,
          candidateId,
          "failed",
          sendErr?.message ? String(sendErr.message) : "Send failed"
        );
        summary.failed++;
        continue;
      }

      await recordSend(positionId, candidateId, "sent", null);
      summary.sent++;
    } catch (err) {
      console.error(err);
      summary.failed++;
    }
  }

  return summary;
}
