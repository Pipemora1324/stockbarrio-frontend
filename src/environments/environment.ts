// Feature flags. ENABLE_ALERTS (read at build time by scripts/set-env.mjs) can turn alerts back on without editing code.
export const environment = {
  // Alerts, the notification inbox and the bell are paused for now; only Offers is shown.
  enableAlerts: false,
};
