// Lightweight overlay modal, independent of the screen router's innerHTML
// churn — it's appended straight to <body> so it survives regardless of
// which screen is currently mounted.

let currentOverlay = null;
const CLOSE_MS = 200;

export function closeModal() {
  if (!currentOverlay) return;
  // Capture the node directly rather than relying on the shared variable —
  // openModal() calls closeModal() to clear out a previous modal before
  // showing a new one, so by the time this timeout fires `currentOverlay`
  // may already point at that new modal instead of this one.
  const overlay = currentOverlay;
  currentOverlay = null;
  overlay.classList.add("closing");
  overlay.style.pointerEvents = "none"; // don't let a fading-out modal eat taps meant for what's behind it
  setTimeout(() => overlay.remove(), CLOSE_MS);
}

export function openModal(innerHTML) {
  closeModal();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet">
      <button type="button" class="modal-close" aria-label="Close">✕</button>
      <div class="modal-body">${innerHTML}</div>
    </div>
  `;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelector(".modal-close").addEventListener("click", closeModal);

  document.body.appendChild(overlay);
  currentOverlay = overlay;
  return overlay.querySelector(".modal-body");
}
