/**
 * src/utils/stealthScripts.js
 * 
 * Injected at the BrowserContext level before any page navigation.
 * Masks automation artifacts and provides a consistent Linux x86_64 fingerprint.
 */

module.exports = `
  // 1. Remove automation flags
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  
  // 2. Consistent environment flags (2 vCPUs, Linux x86_64)
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
  Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  
  // 3. Spoof realistic Chrome runtime
  window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {}
  };

  // 4. Permissions spoofing (Notifications query)
  const originalPermissionsQuery = window.navigator.permissions ? window.navigator.permissions.query : null;
  if (originalPermissionsQuery) {
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' 
        ? Promise.resolve({ state: Notification.permission }) 
        : originalPermissionsQuery(parameters)
    );
  }
`;
