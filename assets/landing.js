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

// S5-1 live time→money demo: the focus timer IS the invoice. Vanilla
// requestAnimationFrame + SVG ring, zero deps. This script only animates the
// numbers — light/dark theming is entirely CSS variables (see the theme IIFE).
(function () {
  const ring = document.getElementById("demoRing");
  const timerEl = document.getElementById("demoTimer");
  const moneyEl = document.getElementById("demoMoney");
  const weekEl = document.getElementById("demoWeek");
  const linesEl = document.getElementById("demoLines");
  const rateEl = document.getElementById("demoRate");
  if (!ring || !timerEl || !moneyEl || !weekEl || !linesEl || !rateEl) return;

  const TASKS = [
    { name: "Onboarding flow", client: "Acme", rate: 110, dot: "#2fd08a" },
    { name: "Brand refresh", client: "Northwind", rate: 85, dot: "#8b83f0" },
    { name: "Marketing site", client: "Pine & Co", rate: 95, dot: "#f0b45e" },
  ];
  const SPEED = 120; // simulated seconds per real second
  const GOAL = 1500; // seconds to fill the ring (a 25-minute pomodoro)
  const CIRC = 308; // 2π·49, matches the SVG stroke-dasharray

  const money = (x) =>
    "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mmss = (s) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  };

  let idx = 0;
  let sec = 0;
  let week = 0;
  let last = null;

  const draw = () => {
    const t = TASKS[idx % TASKS.length];
    timerEl.textContent = mmss(sec);
    moneyEl.textContent = money((t.rate * sec) / 3600);
    ring.setAttribute("stroke-dashoffset", CIRC * (1 - sec / GOAL));
  };

  const bill = (animate) => {
    const t = TASKS[idx % TASKS.length];
    const amount = (t.rate * sec) / 3600;
    week += amount;

    // Build the invoice line with DOM APIs (no innerHTML) so nothing here can
    // ever become an injection surface if the task list grows dynamic.
    const row = document.createElement("div");
    row.className = "lp-line";
    const name = document.createElement("span");
    name.className = "lp-line-name";
    const dot = document.createElement("span");
    dot.className = "lp-line-dot";
    dot.style.background = t.dot;
    name.append(dot, document.createTextNode(t.name + " · " + t.client));
    const amt = document.createElement("span");
    amt.className = "lp-num lp-line-amt";
    amt.textContent = money(amount);
    row.append(name, amt);
    linesEl.insertBefore(row, linesEl.firstChild);
    while (linesEl.children.length > 3) linesEl.removeChild(linesEl.lastChild);
    if (animate) {
      // Double-rAF so the row paints at opacity 0, then transitions in.
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add("in")));
    } else {
      // Seeded rows must be visible without waiting on a transition (a
      // backgrounded tab never runs the rAF that would add the class).
      row.classList.add("in");
      row.style.opacity = "1";
      row.style.transform = "none";
    }

    weekEl.textContent = money(week);
    if (animate) {
      weekEl.style.color = "var(--accent)";
      setTimeout(() => (weekEl.style.color = ""), 450);
    }

    idx += 1;
    sec = 0;
    rateEl.textContent = "$" + TASKS[idx % TASKS.length].rate + "/hr";
  };

  // Seed a believable mid-week snapshot: two sessions already billed, and the
  // current pomodoro partway in. This is what every non-animating context is
  // left showing — a backgrounded tab (rAF is paused), reduced-motion, or a
  // slow first paint — so the card is never a dead column of $0.00.
  idx = 1;
  sec = GOAL;
  bill(false); // Brand refresh — billed
  idx = 2;
  sec = GOAL;
  bill(false); // Marketing site — billed
  idx = 0; // back to Onboarding, matching the card header + rate chip
  sec = GOAL * 0.46; // mid-session
  draw();

  // Reduced-motion: keep the seeded snapshot, run no animation loop.
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // When a backgrounded tab returns, rAF resumes; drop the stale timestamp so
  // the elapsed gap doesn't jump the timer forward in one giant step.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) last = null;
  });

  const frame = (now) => {
    if (last == null) last = now;
    sec += ((now - last) / 1000) * SPEED;
    last = now;
    if (sec >= GOAL) {
      sec = GOAL;
      draw();
      bill(true);
    } else {
      draw();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
