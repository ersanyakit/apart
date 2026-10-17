const fs = require('node:fs');
const path = require('node:path');

/** Mirror Next's static SVG import shape in the temporary Node test build. */
module.exports = function installFlagAssets(output) {
  fs.cpSync(path.resolve(__dirname, '../../src/assets/flags'), path.join(output, 'assets/flags'), {recursive: true});
  require.extensions['.svg'] = (module, filename) => {
    module.exports = {src: '/flags/' + path.basename(filename)};
  };
};
