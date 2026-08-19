import "server-only";
import { Resend } from "resend";
import { APP_CONFIG } from "@/config/app";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM ?? "OneRide <onboarding@resend.dev>";
const resend = KEY ? new Resend(KEY) : null;

/** Public app URL used in email links. */
export const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ride.harivanashram.org";

/** Escape user-supplied text before putting it in email HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sends an email via Resend. No-op (logs) when RESEND_API_KEY is unset. */
export async function sendMail(opts: {
  to: string | null | undefined;
  subject: string;
  html: string;
}) {
  if (!opts.to) return;
  if (!resend) {
    console.info("[mail] skipped (no RESEND_API_KEY):", opts.subject);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (e) {
    console.error("[mail] send failed:", e);
  }
}

/** Minimal branded email shell. */
export function emailLayout(heading: string, body: string, cta?: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1b19;background:#faf7f1">
    <p style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b4690e;margin:0 0 12px">${APP_CONFIG.name}</p>
    <h1 style="font-size:22px;margin:0 0 12px;font-family:Georgia,serif">${heading}</h1>
    <div style="font-size:15px;line-height:1.6;color:#3a352d">${body}</div>
    ${cta ? `<div style="margin-top:20px">${cta}</div>` : ""}
    <p style="font-size:12px;color:#6c665c;margin-top:28px">Coordinate the rest by phone — ${APP_CONFIG.name} never charges for rides.<br>
      <a href="${APP_URL}" style="color:#b4690e;text-decoration:none">${APP_URL.replace(/^https?:\/\//, "")}</a>
    </p>
  </div>`;
}

/** A two-column key/value table. Values may contain trusted HTML (esc() first). */
export function detailsTable(rows: Array<[string, string]>): string {
  const cells = rows
    .map(([label, value], i) => {
      const border = i < rows.length - 1 ? "border-bottom:1px solid #e6ded0;" : "";
      return `<tr>
        <td style="padding:10px 14px;background:#f1ece3;color:#6c665c;font-weight:600;width:34%;white-space:nowrap;vertical-align:top;${border}">${label}</td>
        <td style="padding:10px 14px;color:#1c1b19;vertical-align:top;${border}">${value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border:1px solid #e6ded0;border-radius:12px;overflow:hidden;margin:16px 0;font-size:14px">${cells}</table>`;
}

/** Primary button linking into the app (path is appended to APP_URL). */
export function ctaButton(label: string, path = ""): string {
  return `<a href="${APP_URL}${path}" style="display:inline-block;background:#1c1b19;color:#faf7f1;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">${label} &rarr;</a>`;
}

/** "Name · +91…" with a tel: link, or just the name. */
export function contactLine(name: string | null, phone: string | null): string {
  const safeName = esc(name ?? "—");
  if (!phone) return safeName;
  const tel = phone.replace(/[^\d+]/g, "");
  return `${safeName} &middot; <a href="tel:${tel}" style="color:#b4690e;text-decoration:none;font-weight:600">${esc(phone)}</a>`;
}
