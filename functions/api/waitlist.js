// Cloudflare Pages Function — POST /api/waitlist
//
// Replaces the old Netlify Forms endpoint. Persists each signup to KV (the
// reliable floor — never lost), optionally emails a notification, and returns
// a real {ok:true|false} the client can trust. Runs server-side, so it is not
// subject to the page CSP and may call external APIs.
//
// Bindings / env (set in the Pages project → Settings → Functions):
//   WAITLIST        KV namespace binding (required)
//   RESEND_API_KEY  transactional-email API key (optional — email notify)
//   NOTIFY_TO       recipient address (optional, default hello@docktodo.com)
//   NOTIFY_FROM     verified sender (optional, default noreply@docktodo.com)

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost({ request, env }) {
  // Accept both urlencoded (the form) and JSON.
  let data;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      data = Object.fromEntries(await request.formData());
    }
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Honeypot: a real browser leaves the hidden bot-field empty. If it's filled,
  // silently drop (don't store) but answer ok so the bot doesn't retry.
  if (typeof data["bot-field"] === "string" && data["bot-field"].trim() !== "") {
    return json({ ok: true });
  }

  const email = String(data.email || "").trim();
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  // KV is the reliable floor. Without it there is nowhere durable to write, so
  // fail loudly rather than pretend success (the whole point of S8).
  if (!env.WAITLIST) {
    return json({ ok: false, error: "storage_unconfigured" }, 500);
  }

  const record = {
    email,
    billing: String(data.billing || "").slice(0, 200),
    source: String(data.source || "").slice(0, 60),
    at: new Date().toISOString(),
    ua: (request.headers.get("user-agent") || "").slice(0, 300),
    ip: request.headers.get("cf-connecting-ip") || "",
  };

  const key = `${Date.now()}-${crypto.randomUUID()}`;
  try {
    await env.WAITLIST.put(key, JSON.stringify(record));
  } catch {
    return json({ ok: false, error: "storage_write_failed" }, 500);
  }

  // Best-effort email notification. KV already has the signup, so a mail
  // failure must NOT fail the request.
  if (env.RESEND_API_KEY) {
    const to = env.NOTIFY_TO || "hello@docktodo.com";
    const from = env.NOTIFY_FROM || "DockTodo <noreply@docktodo.com>";
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject: `New waitlist signup: ${email}`,
          text: `Email:   ${email}\nBilling: ${record.billing}\nSource:  ${record.source}\nWhen:    ${record.at}`,
        }),
      });
    } catch {
      /* email is a bonus; the KV write is the source of truth */
    }
  }

  return json({ ok: true });
}

// A stray GET (or preflight) shouldn't 405-noise; point it at the form.
export async function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed", hint: "POST form data here" }, 405);
}
