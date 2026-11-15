// Pure helper: turns service worker facts into the text shown by the indicator.
export function offlineStatus({ supported, ready, online }) {
  const network = online ? 'Online' : 'Offline'
  if (!supported) {
    return {
      key: 'unsupported',
      label: 'Offline not available',
      detail: `${network}. This browser or build has no service worker, so Driftwatch needs the first load again after a restart.`,
    }
  }
  if (!ready) {
    return {
      key: 'preparing',
      label: 'Preparing offline use',
      detail: `${network}. Keep this page open until it says Offline ready.`,
    }
  }
  return {
    key: 'ready',
    label: 'Offline ready',
    detail: `${network}. Rules, scenario and screens are saved on this device.`,
  }
}
