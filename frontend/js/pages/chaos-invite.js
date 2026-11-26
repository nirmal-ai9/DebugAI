(() => {
  const dialog = document.getElementById("chaos-invite");
  const go = document.getElementById("chaos-invite-go");
  const close = document.getElementById("chaos-invite-close");
  if (!dialog || !go || !close || typeof dialog.showModal !== "function") return;

  // One invitation per tab session; dismissing it never blocks the main tool.
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem("debugai-chaos-invite-seen") === "1";
  } catch (_) {}

  if (!alreadySeen) {
    window.setTimeout(() => {
      if (!dialog.open) dialog.show();
      try { sessionStorage.setItem("debugai-chaos-invite-seen", "1"); } catch (_) {}
    }, 1400);
  }

  close.addEventListener("click", () => dialog.close());
  go.addEventListener("click", () => {
    window.location.href = "chaos.html";
  });
})();
