// CONTROLLER: register the service worker that makes SideQuest installable (Add to Home Screen).
// Only on HTTPS or localhost, and never under test automation unless a test asks for it with
// ?sw-test, so the browser suites stay deterministic. See public/sw.js for what it keeps.
export function registerInstallableApp(nav: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
  where: Location | undefined = typeof location !== 'undefined' ? location : undefined): boolean {
  if (!nav || !where || !('serviceWorker' in nav)) return false
  const secure = where.protocol === 'https:' || where.hostname === 'localhost' || where.hostname === '127.0.0.1'
  const automated = (nav as Navigator & { webdriver?: boolean }).webdriver === true && !new URLSearchParams(where.search).has('sw-test')
  if (!secure || automated) return false
  void nav.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* the app works without it */ })
  return true
}
