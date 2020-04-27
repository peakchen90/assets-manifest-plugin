const chalk = require('chalk');
const { pluginName } = require('../package.json');

module.exports = function warn(message) {
  console.log(chalk.yellow(`⬢ [${pluginName} Warn]:\n  ${message} \n`));
};
