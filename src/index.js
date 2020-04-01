const path = require('path');
const validateOptions = require('schema-utils');
const beautifyJS = require('js-beautify').js;
const uglifyJS = require('uglify-js');
const pathExist = require('path-exists').sync;

const schema = {
  type: 'object',
  properties: {
    chunks: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1
      },
    },
    publicPath: {
      type: 'string',
    },
    filename: {
      type: 'string',
      minLength: 1,
      pattern: '\\.js$'
    },
    minify: {
      type: 'boolean'
    },
    globalName: {
      type: 'string',
      minLength: 1
    }
  }
};

class AssetsManifestPlugin {
  constructor(options = {}) {
    validateOptions(schema, options);
    const defaultOptions = {
      chunks: null,
      publicPath: null,
      filename: 'assets-manifest.js',
      minify: false,
      globalName: 'ASSETS_MANIFEST'
    };

    Object.keys(options).forEach(key => {
      const value = options[key];
      if (value != null) {
        defaultOptions[key] = value;
      }
    });

    this.options = defaultOptions;
  }

  apply(compiler) {
    compiler.hooks.emit.tapPromise('AssetsManifestPlugin', async (compilation) => {
      const { output } = compiler.options;
      const { entrypoints } = compilation;
      const { filename } = this.options;
      let assetName = filename;
      if (path.isAbsolute(filename)) {
        assetName = path.relative(output.path, filename);
      }

      let publicPath = '';
      if (this.options.publicPath != null) {
        publicPath = this.options.publicPath;
      } else if (output.publicPath != null) {
        publicPath = output.publicPath;
      }

      const assetsManifest = this.getFilesManifest(entrypoints);
      this.setPublicPath(assetsManifest, publicPath);
      const manifest = this.classifyAssets(assetsManifest);
      const code = this.genUmdCode(manifest);

      compilation.assets[assetName] = {
        source: () => code,
        size: () => code.length
      };
    });
  }

  setPublicPath(manifest, publicPath) {
    Object.keys(manifest).forEach(chunk => {
      manifest[chunk] = manifest[chunk].map(asset => publicPath + asset);
    });
  }

  classifyAssets(filename, assetsManifest) {
    let manifest = {};
    if (pathExist(filename)) {
      manifest = require(filename);
    }

    Object.keys(assetsManifest).forEach(chunk => {
      const assets = assetsManifest[chunk];
      manifest[chunk] = {
        js: assets.filter(asset => /\.js$/.test(asset)),
        css: assets.filter(asset => /\.js$/.test(asset))
      };
    });

    return manifest;
  }

  getFilesManifest(entrypoints) {
    const manifest = {};
    let { chunks } = this.options;

    if (chunks) {
      chunks.forEach(chunk => {
        const entrypoint = entrypoints.get(chunk);
        let files = [];
        if (entrypoint) {
          files = entrypoints.runtimeChunk.files;
        }
        manifest[chunk] = files;
      });
    } else {
      chunks = Array.from(entrypoints.keys());
      chunks.forEach(chunk => {
        const { runtimeChunk } = entrypoints.get(chunk);
        manifest[chunk] = runtimeChunk.files;
      });
    }

    return manifest;
  }

  genUmdCode(assetsManifest) {
    const { globalName, minify } = this.options;

    const code = `
      (function (root, factory) {
        if (typeof exports === 'object' && typeof module === 'object') {
          module.exports = factory();
        } else if (typeof define === 'function' && define.amd) {
          define(factory);
        } else if (typeof exports === 'object') {
          exports['${globalName}'] = factory();
        } else {
          root['${globalName}'] = factory();
        }
      })(this, function () {
        // assets manifest
        return ${JSON.stringify(assetsManifest, null, '  ')}
      });`;

    return minify
      ? uglifyJS.minify(code).code
      : beautifyJS(code, { indent_size: 2 });
  }
}

module.exports = AssetsManifestPlugin;
