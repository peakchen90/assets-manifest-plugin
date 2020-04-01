const path = require('path');
const fs = require('fs');
const promisify = require('util').promisify;
const validateOptions = require('schema-utils');
const beautifyJS = require('js-beautify').js;
const uglifyJS = require('uglify-js');
const pathExist = require('path-exists').sync;

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

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
    uglify: {
      type: 'boolean'
    },
    global: {
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
      uglify: false,
      global: 'ASSETS_MANIFEST'
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
    compiler.hooks.done.tapPromise('AssetsManifestPlugin', (stats) => {
      return this.handleManifest(stats.compilation);
    });
  }

  async handleManifest(compilation) {
    const { entrypoints, outputOptions } = compilation;
    const { filename } = this.options;
    const manifestFilename = path.join(outputOptions.path, filename);

    let publicPath = '';
    if (this.options.publicPath != null) {
      publicPath = this.options.publicPath;
    } else if (outputOptions.publicPath != null) {
      publicPath = outputOptions.publicPath;
    }

    const assetsManifest = this.getFilesManifest(entrypoints);
    this.setPublicPath(assetsManifest, publicPath);
    const manifest = this.classifyAssets(manifestFilename, assetsManifest);
    const code = this.genUmdCode(manifest);
    await this.emit(manifestFilename, code);
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
    const { global, uglify } = this.options;

    const code = `
      (function (root, factory) {
        if (typeof exports === 'object' && typeof module === 'object') {
          module.exports = factory();
        } else if (typeof define === 'function' && define.amd) {
          define(factory);
        } else if (typeof exports === 'object') {
          exports['${global}'] = factory();
        } else {
          root['${global}'] = factory();
        }
      })(this, function () {
        // assets manifest
        return ${JSON.stringify(assetsManifest, null, '  ')}
      });`;

    return uglify
      ? uglifyJS.minify(code).code
      : beautifyJS(code, { indent_size: 2 });
  }

  async emit(filename, code) {
    const dirname = path.dirname(filename);
    if (!pathExist(dirname)) {
      await mkdir(dirname, { recursive: true });
    }
    await writeFile(filename, code);
  }
}

module.exports = AssetsManifestPlugin;
