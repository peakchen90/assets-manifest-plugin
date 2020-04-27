module.exports = {
  genUmdCode(globalName, code) {
    return `
     (function (root, factory) {
        if (typeof exports === 'object' && typeof module === 'object') {
          module.exports = factory();
        } else if (typeof define === 'function' && define.amd) {
          define([], factory);
        } else if (typeof exports === 'object') {
          exports['${globalName}'] = factory();
        } else {
          root['${globalName}'] = factory();
        }
      })(typeof window !== 'undefined' ? window : this, function () {
        return ${code}
      });`;
  }
};
