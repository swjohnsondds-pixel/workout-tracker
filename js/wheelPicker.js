// A small iOS-style scroll wheel picker. There's no native HTML element for
// this — it's built from a scroll-snap list plus a JS controller that
// figures out which item settled in the center and keeps it snapped there.

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const SETTLE_DELAY_MS = 120;

export function createWheelPicker(container, { values, initialValue, formatLabel = String, onChange }) {
  const height = ITEM_HEIGHT * VISIBLE_COUNT;
  const padding = (height - ITEM_HEIGHT) / 2;

  container.classList.add("wheel-picker");
  container.style.height = `${height}px`;
  container.innerHTML = `
    <div class="wheel-highlight" style="height:${ITEM_HEIGHT}px;"></div>
    <div class="wheel-scroll" style="padding:${padding}px 0;">
      ${values
        .map(
          (v) =>
            `<div class="wheel-item" style="height:${ITEM_HEIGHT}px;line-height:${ITEM_HEIGHT}px;">${formatLabel(v)}</div>`
        )
        .join("")}
    </div>
  `;

  const scrollEl = container.querySelector(".wheel-scroll");
  const items = scrollEl.querySelectorAll(".wheel-item");
  let currentValue = values.includes(initialValue) ? initialValue : values[0];

  function indexOf(value) {
    const idx = values.indexOf(value);
    return idx === -1 ? 0 : idx;
  }

  function highlightCenter(idx) {
    items.forEach((el, i) => el.classList.toggle("centered", i === idx));
  }

  function scrollToIndex(idx, smooth) {
    scrollEl.scrollTo({ top: idx * ITEM_HEIGHT, behavior: smooth ? "smooth" : "auto" });
    highlightCenter(idx);
  }

  let settleTimer = null;
  scrollEl.addEventListener("scroll", () => {
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(scrollEl.scrollTop / ITEM_HEIGHT)));
    highlightCenter(idx);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      scrollToIndex(idx, true);
      currentValue = values[idx];
      if (onChange) onChange(currentValue);
    }, SETTLE_DELAY_MS);
  });

  items.forEach((el, idx) => {
    el.addEventListener("click", () => {
      scrollToIndex(idx, true);
      currentValue = values[idx];
      if (onChange) onChange(currentValue);
    });
  });

  // Set initial scroll position after layout so the container has real
  // dimensions to scroll within.
  requestAnimationFrame(() => scrollToIndex(indexOf(currentValue), false));

  return {
    getValue: () => currentValue,
    setValue: (v) => {
      currentValue = values.includes(v) ? v : values[0];
      scrollToIndex(indexOf(currentValue), true);
    },
  };
}

export function range(min, max, step) {
  const out = [];
  for (let v = min; v <= max; v += step) out.push(v);
  return out;
}
