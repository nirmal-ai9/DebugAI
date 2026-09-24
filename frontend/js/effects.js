document.addEventListener("DOMContentLoaded", () => {

  // 1. DARK / LIGHT THEME SWITCHER (initial theme is set early by theme-init.js)
  (function initTheme() {
    const THEME_KEY = "theme";
    const themeBtn = document.getElementById("theme-toggle-btn");

    function readSavedTheme() {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch {
        return null;
      }
    }

    function saveTheme(theme) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Not persisting is fine; the theme still applies for this visit.
      }
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme === "dark" ? "#050a07" : "#f3f7fb");

      if (themeBtn) {
        const isDark = theme === "dark";
        themeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
        themeBtn.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
      }
    }

    applyTheme(document.documentElement.getAttribute("data-theme") || "dark");

    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        saveTheme(next);
      });
    }

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!readSavedTheme()) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  })();

  // 2. CONTROLLABLE MATRIX RAIN ANIMATION
  (function matrixRain() {
    const canvas = document.getElementById("matrix-rain");
    const toggleBtn = document.getElementById("rain-toggle-btn");

    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      canvas.remove();
      if (toggleBtn) toggleBtn.style.display = "none";
      return;
    }

    const ctx = canvas.getContext("2d");
    const glyphs = "01アイウエオカキクケコサシスセソDEBUG{}<>/;=+-*ABCDEF0123456789";
    const fontSize = 15;
    let columns = 0;
    let drops = [];

    let raf = null;
    let lastFrame = 0;
    const frameInterval = 1000 / 20; // 20fps for background flourish
    let isRunning = true;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -40));
    }

    function draw() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";

      // Dynamically fade trail color based on active theme
      ctx.fillStyle = isDark ? "rgba(5, 10, 7, 0.16)" : "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < columns; i++) {
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Theme-aware green glyph styling
        ctx.fillStyle = isDark ? "rgba(57, 255, 138, 0.85)" : "rgba(16, 124, 65, 0.85)";
        ctx.fillText(glyph, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    function loop(timestamp) {
      if (!isRunning) return;
      raf = requestAnimationFrame(loop);
      if (timestamp - lastFrame < frameInterval) return;
      lastFrame = timestamp;
      draw();
    }

    function startRain() {
      if (isRunning) return;
      isRunning = true;
      if (toggleBtn) {
        toggleBtn.textContent = "Stop Rain";
      }
      raf = requestAnimationFrame(loop);
    }

    function stopRain() {
      isRunning = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (toggleBtn) {
        toggleBtn.textContent = "Start Rain";
      }
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        if (isRunning) {
          stopRain();
        } else {
          startRain();
        }
      });
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    // Pause animation loop when tab is hidden to save battery/cycles
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
      } else if (isRunning) {
        raf = requestAnimationFrame(loop);
      }
    });

    resize();
    raf = requestAnimationFrame(loop);
  })();

  // 3. SCROLL REVEAL OBSERVER
  (function scrollReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      targets.forEach(el => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // Stagger reveal across batch crossing viewport together
            setTimeout(() => entry.target.classList.add("is-visible"), i * 70);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(el => observer.observe(el));
  })();

});
