const path = require('path');
const validateOptions = require('schema-utils');
const beautifyJS = require('js-beautify').js;
const uglifyJS = require('uglify-js');
const pathExists = require('path-exists');
const ip = require('ip').address();
const warn = require('./warn');
const { pluginName } = require('../package.json');
const { genUmdCode } = require('./templates');
const optionsSchema = require('./options.json');

class AssetsManifestPlugin {
  constructor(options = {}) {
    validateOptions(optionsSchema, options);

    const defaultOptions = {
      entries: 'all',
      publicPath: null,
      filename: 'manifest.js',
      minify: 'auto',
      globalName: 'ASSETS_MANIFEST',
      disabled: false,
      shouldEmit: true,
      merge: false,
      onEmit: null,
      devServerAutoPublicPath: true
    };

    Object.keys(options).forEach(key => {
      const value = options[key];
      if (value != null) {
        defaultOptions[key] = value;
      }
    });

    this.options = defaultOptions;
    this.IS_DEV_SERVER = Boolean(process.env.WEBPACK_DEV_SERVER);
  }

  apply(compiler) {
    if (this.options.disabled) {
      return;
    }

    compiler.hooks.emit.tapPromise(pluginName, async (compilation) => {
      const { filename, shouldEmit, merge, minify, onEmit } = this.options;
      const { entrypoints, options } = compilation;

      if (options.output.jsonpFunction === 'webpackJsonp') {
        warn('Option `webpack.output.jsonpFunction` should not be `webpackJsonp`, it is better to set it like `webpackJsonp_[ProjectName]`');
      }

      let assetName = filename;
      if (path.isAbsolute(filename)) {
        assetName = path.relative(options.output.path, filename);
      }

      const assetsManifest = this.getAssetsManifest(entrypoints);
      this.setPublicPath(compilation, assetsManifest);
      const manifest = this.getClassifyManifest(assetsManifest);
      let mergedManifest = manifest;

      if (merge && !this.IS_DEV_SERVER) {
        try {
          const manifestPath = path.join(options.output.path, assetName);
          if (await pathExists(manifestPath)) {
            const value = require(manifestPath);
            if (value && typeof value === 'object') {
              mergedManifest = Object.assign(value, manifest);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (shouldEmit) {
        const type = /\.(js|json)$/.exec(assetName)[1];
        let minimize = minify;
        if (minify === 'auto') {
          minimize = options.optimization.minimize;
        }
        const code = this.genCode(mergedManifest, type, minimize);
        compilation.assets[assetName] = {
          source: () => code,
          size: () => code.length
        };
      }

      if (typeof onEmit === 'function') {
        onEmit.call(this, manifest, mergedManifest);
      }
    });
  }

  setPublicPath(compilation, manifest) {
    const { devServerAutoPublicPath, } = this.options;
    const { output, devServer = {} } = compilation.options;

    let publicPath = this.options.publicPath;
    let publicPathFallback = '';

    if (this.IS_DEV_SERVER) {
      const { publicPath: _publicPath } = devServer;
      if (_publicPath != null) {
        publicPathFallback = _publicPath;
      } else if (output.publicPath != null) {
        publicPathFallback = output.publicPath;
      }
    } else if (output.publicPath != null) {
      publicPathFallback = output.publicPath;
    }

    if (this.IS_DEV_SERVER && devServerAutoPublicPath) {
      publicPath = publicPathFallback;
      if (!/^\//.test(publicPath)) {
        publicPath = `/${publicPath}`;
      }
      const { https, port } = devServer;
      const protocol = https ? 'https' : 'http';
      publicPath = `${protocol}://${ip}:${port}${publicPath}`;
    } else {
      if (publicPath == null) {
        publicPath = publicPathFallback;
      }
    }

    Object.keys(manifest).forEach(entry => {
      manifest[entry] = manifest[entry].map(asset => publicPath + asset);
    });
  }

  getClassifyManifest(assetsManifest) {
    let manifest = {};

    Object.keys(assetsManifest).forEach(entry => {
      const assets = assetsManifest[entry];
      manifest[entry] = {
        js: assets.filter(asset => /\.js$/.test(asset)),
        css: assets.filter(asset => /\.css$/.test(asset))
      };
    });

    return manifest;
  }

  getAssetsManifest(entrypoints) {
    const manifest = {};
    let { entries } = this.options;

    if (entries === 'all') {
      entries = [...entrypoints.keys()];
    }

    entries.forEach(entry => {
      const entrypoint = entrypoints.get(entry);
      let files = [];
      if (entrypoint) {
        entrypoint.chunks.forEach((chunk) => {
          files.push(...chunk.files);
        });
      }
      manifest[entry] = files;
    });

    return manifest;
  }

  genCode(manifest, type, minimize) {
    const { globalName } = this.options;

    if (type === 'json') {
      return JSON.stringify(manifest, null, minimize ? '' : '  ');
    }

    const code = genUmdCode(
      globalName,
      JSON.stringify(manifest, null, '  ')
    );

    return minimize
      ? uglifyJS.minify(code).code
      : beautifyJS(code, { indent_size: 2 });
  }
}

module.exports = AssetsManifestPlugin;
