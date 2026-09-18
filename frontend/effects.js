
(function matrixRain() {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext("2d");
  const glyphs = "01アイウエオカキクケコサシスセソDEBUG{}<>/;=+-*ABCDEF0123456789";
  const fontSize = 15;
  let columns = 0;
  let drops = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -40));
  }

  function draw() {
    // Trail fade — low alpha over the previous frame, not a full clear.
    ctx.fillStyle = "rgba(5, 10, 7, 0.16)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

    for (let i = 0; i < columns; i++) {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // Leading character glows brighter than the trailing tail.
      ctx.fillStyle = "rgba(57, 255, 138, 0.85)";
      ctx.fillText(glyph, x, y);

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  let raf;
  let lastFrame = 0;
  const frameInterval = 1000 / 20; // 20fps is plenty for a background flourish

  function loop(timestamp) {
    raf = requestAnimationFrame(loop);
    if (timestamp - lastFrame < frameInterval) return;
    lastFrame = timestamp;
    draw();
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Pause the animation loop when the tab is hidden to save cycles.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(loop);
    }
  });

  resize();
  raf = requestAnimationFrame(loop);
})();

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
          // Small stagger within whatever batch crosses the viewport together.
          setTimeout(() => entry.target.classList.add("is-visible"), i * 70);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach(el => observer.observe(el));
})();
