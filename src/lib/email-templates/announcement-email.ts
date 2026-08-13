import {
  baseTemplate, escHtml,
  h2, p, divider,
} from "./base";

export interface AnnouncementEmailData {
  schoolName:    string;
  recipientName: string;
  title:         string;
  content:       string;
  publishedBy:   string;
  publishedAt:   string;
}

export function announcementEmail(data: AnnouncementEmailData): string {
  // Truncate very long content for email; link to portal for full view
  const maxLen     = 800;
  const bodyText   = data.content.length > maxLen
    ? data.content.slice(0, maxLen) + "…"
    : data.content;

  const content = `
    ${h2("School Announcement")}
    ${p(`Dear <strong>${escHtml(data.recipientName)}</strong>,`)}
    ${p(`<strong>${escHtml(data.schoolName)}</strong> has published a new announcement.`)}

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
      padding:20px 24px;margin:16px 0;">
      <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:700;">
        ${escHtml(data.title)}
      </h3>
      <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;
        white-space:pre-wrap;">
        ${escHtml(bodyText)}
      </p>
    </div>

    <p style="margin:8px 0;color:#64748b;font-size:12px;">
      Published by <strong>${escHtml(data.publishedBy)}</strong>
      on ${escHtml(data.publishedAt)}
    </p>

    ${divider()}
    ${p(`<span style="color:#94a3b8;font-size:12px;">
      Log in to the school portal to view the full announcement and
      any related documents.
    </span>`)}
  `;

  return baseTemplate(data.schoolName, content);
}

export function announcementEmailSubject(
  schoolName: string,
  title: string,
): string {
  return `[${schoolName}] Announcement: ${title}`;
}