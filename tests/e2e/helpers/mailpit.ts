import { expect } from "@playwright/test";

// Local Supabase sends auth emails to Mailpit (see `npx supabase status`).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSummary = { ID: string; Subject: string };

/**
 * Waits for the newest email to `to` whose subject contains `subject`, then
 * returns the path + query of the first link to `linkPath` (e.g.
 * /auth/confirm). Emails link to Supabase's site_url (port 3000); returning a
 * relative path lets page.goto() open it on the test server instead.
 */
export async function getEmailLink(
  to: string,
  { subject, linkPath }: { subject: string; linkPath: string },
): Promise<string> {
  let message: MailpitSummary | undefined;

  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}" subject:"${subject}"`);
        const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
        const body = (await res.json()) as { messages: MailpitSummary[] };
        message = body.messages[0];
        return Boolean(message);
      },
      { message: `email "${subject}" to ${to}`, timeout: 15_000 },
    )
    .toBe(true);

  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${message!.ID}`);
  const { HTML } = (await res.json()) as { HTML: string };

  for (const [, href] of HTML.matchAll(/href="([^"]+)"/g)) {
    const url = new URL(href.replaceAll("&amp;", "&"));
    if (url.pathname === linkPath) return url.pathname + url.search;
  }
  throw new Error(`No ${linkPath} link in email "${message!.Subject}"`);
}
