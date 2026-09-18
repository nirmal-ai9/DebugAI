/**
 * effects.js
 * Seamlessly hooks into existing hero section buttons for Theme Toggle 
 * and Rain Animation control.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. THEME SWITCHER
  // =========================================================================

  const THEME_KEY = 'theme';

  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, themeBtn) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    if (themeBtn) {
      const isDark = theme === 'dark';
      // Updates button text while preserving existing styling/classes
      themeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
      themeBtn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    }
  }

  function initTheme() {
    // Targets existing button in hero section (update selector if using classes)
    const themeBtn = document.querySelector('.hero #theme-toggle, #theme-toggle');
    applyTheme(getPreferredTheme(), themeBtn);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme, themeBtn);
      });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light', themeBtn);
      }
    });
  }

  // =========================================================================
  // 2. RAIN ANIMATION CONTROLLER
  // =========================================================================

  class RainController {
    constructor(canvasSelector, buttonSelector) {
      this.canvas = document.querySelector(canvasSelector);
      this.toggleBtn = document.querySelector(buttonSelector);
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

      this.drops = [];
      this.maxDrops = 140;
      this.animationFrameId = null;
      this.isRunning = false;

      if (this.canvas && this.ctx) {
        this.init();
      }
    }

    init() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      if (this.toggleBtn) {
        this.toggleBtn.addEventListener('click', () => this.toggle());
      }

      this.start();
    }

    resizeCanvas() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.populateDrops();
    }

    populateDrops() {
      this.drops = [];
      for (let i = 0; i < this.maxDrops; i++) {
        this.drops.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          length: Math.random() * 20 + 10,
          speed: Math.random() * 12 + 6,
          opacity: Math.random() * 0.4 + 0.2
        });
      }
    }

    render() {
      if (!this.ctx || !this.isRunning) return;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      const rgbColor = isDarkMode ? '140, 200, 255' : '0, 102, 204';

      for (let i = 0; i < this.drops.length; i++) {
        const drop = this.drops[i];

        this.ctx.beginPath();
        this.ctx.moveTo(drop.x, drop.y);
        this.ctx.lineTo(drop.x, drop.y + drop.length);
        this.ctx.strokeStyle = `rgba(${rgbColor}, ${drop.opacity})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        drop.y += drop.speed;

        if (drop.y > this.canvas.height) {
          drop.y = -drop.length;
          drop.x = Math.random() * this.canvas.width;
        }
      }

      this.animationFrameId = requestAnimationFrame(() => this.render());
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;

      if (this.toggleBtn) {
        this.toggleBtn.textContent = '⏹️ Stop Rain';
        this.toggleBtn.setAttribute('aria-pressed', 'false');
      }

      this.render();
    }

    stop() {
      this.isRunning = false;

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }

      if (this.toggleBtn) {
        this.toggleBtn.textContent = '🌧️ Start Rain';
        this.toggleBtn.setAttribute('aria-pressed', 'true');
      }
    }

    toggle() {
      if (this.isRunning) {
        this.stop();
      } else {
        this.start();
      }
    }
  }

  // =========================================================================
  // 3. INITIALIZATION
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    // Connects to your existing canvas and hero rain toggle button
    new RainController('#rain-canvas', '.hero #stop-rain-btn, #stop-rain-btn');
  });
})();
