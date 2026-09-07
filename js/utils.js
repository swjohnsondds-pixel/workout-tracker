export function roundToIncrement(weight, increment = 5) {
  return Math.round(weight / increment) * increment;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
