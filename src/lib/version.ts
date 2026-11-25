/**
 * Single dynamic application version sourced at build time from package.json.
 * Updating "version" in package.json automatically updates every reference across the app.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
