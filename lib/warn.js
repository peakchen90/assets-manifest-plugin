const chalk = require('chalk');

module.exports = function warn(message) {
  console.log(chalk.yellow('[AssetsManifestPlugin Warn]:\n  ' + message + '\n'));
};
