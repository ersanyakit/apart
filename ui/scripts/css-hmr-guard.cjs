/** Next 16.4 Webpack CSS HMR may finish after React has detached the old link.
 * Limit the workaround to this runtime via next.config.mjs; Element.remove()
 * is idempotent and preserves the normal load/error cleanup behavior.
 */
module.exports = function cssHmrGuard(source) {
  return source.replaceAll('e.parentNode.removeChild(e)', 'e.remove()');
};
