// Landing page behavior (S3-2a): route the Founding/Pro CTAs to the waitlist
// form with the right hidden source, and submit the Netlify form over AJAX so
// the visitor gets an inline success message instead of a redirect.

// S5 dual-mode theme: follow prefers-color-scheme, remember a manual choice.
(function () {
  const root = document.querySelector(".landing");
  const toggle = document.getElementById("themeToggle");
  if (!root || !toggle) return;
  const KEY = "docktodo.theme";
  const SUN =
    '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  const MOON =
    '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (e) {
    /* storage blocked */
  }
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  const isDark = () => {
    const dt = root.getAttribute("data-theme");
    return dt === "dark" || (!dt && window.matchMedia("(prefers-color-scheme: dark)").matches);
  };
  const paint = () => {
    toggle.innerHTML = isDark() ? SUN : MOON;
  };
  paint();
  toggle.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {
      /* storage blocked */
    }
    paint();
  });
})();

document.querySelectorAll("[data-waitlist]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sourceField = document.querySelector("#waitlistFormTop [name=source]");
    if (sourceField) sourceField.value = btn.dataset.waitlist;
    document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

const SUCCESS =
  "You're on the list — founding seats are honored in signup order. We'll email you once, when Pro sync ships. Until then, the free app is open and every hour it captures is yours to bill.";

document.querySelectorAll(".wl-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = new URLSearchParams(new FormData(form)).toString();
    try {
      // Netlify Forms accepts a urlencoded POST to any path on the site.
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const done = document.createElement("p");
      done.className = "wl-success";
      done.textContent = SUCCESS;
      form.replaceWith(done);
    } catch {
      const err = document.createElement("p");
      err.className = "wl-note";
      err.style.color = "var(--red)";
      err.textContent = "Something went wrong — please try again, or email hello@docktodo.com.";
      form.append(err);
    }
  });
});
