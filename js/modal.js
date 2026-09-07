// Lightweight overlay modal, independent of the screen router's innerHTML
// churn — it's appended straight to <body> so it survives regardless of
// which screen is currently mounted.

let currentOverlay = null;

export function closeModal() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
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
