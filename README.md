# assets-manifest-plugin
A webpack plugin for entry assets manifest.
一个生成入口资源清单的webpack插件

[![Travis (.org) branch](https://img.shields.io/travis/peakchen90/assets-manifest-plugin/master.svg)](https://travis-ci.org/peakchen90/assets-manifest-plugin)
[![npm](https://img.shields.io/npm/v/assets-manifest-plugin.svg)](https://www.npmjs.com/package/assets-manifest-plugin)
[![GitHub](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/peakchen90/assets-manifest-plugin/blob/master/LICENSE)

## 安装

```bash
npm i -D assets-manifest-plugin

# or

yarn add -D assets-manifest-plugin
```

## 配置

webpack.config.js
```js
const AssetsManifestPlugin = require('assets-manifest-plugin');

module.exports = {
  // ...
  plugins: [
    new AssetsManifestPlugin({
      filename: 'assets-manifest.js'
    })
  ]
}
```

打包成功完成后会输出类似下面的一个文件：
```js
(function(root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    exports['ASSETS_MANIFEST'] = factory();
  } else {
    root['ASSETS_MANIFEST'] = factory();
  }
})(this, function() {
  // assets manifest
  return {
    "main": {
      "js": [
        "js/runtime.6b509e0d.js",
        "js/vendors.066af6ec2.js",
        "js/main.5f10cd1d.js"
      ],
      "css": [
        "css/vendors.ac89822e.css",
        "css/main.5ceab323.css"
      ]
    }
  }
});
```

## 配置选项

#### entries
- 类型: `'all' | Array<string>`
- 默认: `'all'`
- 描述: 需要生成资源清单的 entry 名，如果设置为 `'all'`，表示生成全部入口资源清单

#### publicPath
- 类型: `string`
- 默认: `null`
- 描述: 在生成的资源清单路径前加的一段路径，如果该项未配置，则会去使用 `output.publicPath` 的值

#### filename
- 类型: `string`
- 默认: `'assets-manifest.js'`
- 描述: 生成的入口清单文件名（可以带路径），如果是文件格式是 `.js`，这会输入一个 UMD 模块文件，如果文件格式是 `.json`，则输出一个 JSON 文件，推荐生成 UMD 模块

#### minify
- 类型: `'auto' | boolean`
- 默认: `'auto'`
- 描述: 是否压缩生成的资源清单文件，如果设置为 `'auto'`，表示根据 `optimization.minimize` 自动判断是否需要压缩

#### globalName
- 类型: `string`
- 默认: `'ASSETS_MANIFEST'`
- 描述: 生成 UMD 模块的全局变量名

#### disabled
- 类型: `boolean`
- 默认: `false`
- 描述: 是否禁用插件

#### shouldEmit
- 类型: `boolean`
- 默认: `true`
- 描述: 是否将入口资源清单输出到文件

#### onEmit
- 类型: `(manifest) => void`
- 默认: `null`
- 描述: 当生成入口资源清单时，执行回调。回调参数是一个包含资源清单的 JSON 对象

#### devServerAutoPublicPath
- 类型: `boolean`
- 默认: `true`
- 描述: 当前是 devServer 模式时，自动设置 publicPath (`http://ip:port/publicPath`)
