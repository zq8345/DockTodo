// Landing page behavior (S3-2a): route the Founding/Pro CTAs to the waitlist
// form with the right hidden source, and submit the Netlify form over AJAX so
// the visitor gets an inline success message instead of a redirect.

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
