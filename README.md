# @zougt/less-loader

fork 自[webpack-contrib/less-loader](https://github.com/webpack-contrib/less-loader)，在`less-loader`的基础上增加了`multipleScopeVars`属性，用于根据多个 less 变量文件编译出多种添加了权重类名的样式（不得不修改 less-loader 的源码达到此目的）

> 没有添加`multipleScopeVars`属性时，`@zougt/less-loader`跟`less-loader`是一致的  
> `@zougt/less-loader v7.4.0+` 对应 `less-loader v7.3.0+`  
> `@zougt/less-loader v8.1.0+` 对应 `less-loader v8.0.0+`

## 使用

```console
$ npm install less @zougt/less-loader --save-dev
```

在 webpack.config.js 使用`less-loader`的地方替换成`@zougt/less-loader`, 并添加`multipleScopeVars`属性

```js
const path = require("path");
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        // loader: "less-loader",
        loader: "@zougt/less-loader",
        options: {
          multipleScopeVars: [
            {
              scopeName: "theme-default",
              path: path.resolve("src/theme/default-vars.less"),
            },
            {
              scopeName: "theme-mauve",
              path: path.resolve("src/theme/mauve-vars.less"),
            },
          ],
        },
      },
    ],
  },
};
```

## 示例

```less
//src/theme/default-vars.less
@primary-color: #0081ff;
```

```less
//src/theme/mauve-vars.less
@primary-color: #9c26b0;
```

```less
//src/components/Button/style.less
@import "../../theme/default-vars";
.un-btn {
  position: relative;
  display: inline-block;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  border: 1px solid transparent;
  background-color: @primary-color;
  .anticon {
    line-height: 1;
  }
}
```

编译之后

src/components/Button/style.css

```css
.theme-default .un-btn {
  position: relative;
  display: inline-block;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  border: 1px solid transparent;
  background-color: #0081ff;
}
.theme-mauve .un-btn {
  position: relative;
  display: inline-block;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  border: 1px solid transparent;
  background-color: #9c26b0;
}
.theme-default .un-btn .anticon {
  line-height: 1;
}
.theme-mauve .un-btn .anticon {
  line-height: 1;
}
```

冗余的 css 通过[postcss-loader](https://github.com/webpack-contrib/postcss-loader)的插件[cssnano](https://github.com/cssnano/cssnano)合并

```css
.theme-default .un-btn,
.theme-mauve .un-btn {
  position: relative;
  display: inline-block;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  border: 1px solid transparent;
}
.theme-default .un-btn {
  background-color: #0081ff;
}
.theme-mauve .un-btn {
  background-color: #9c26b0;
}
.theme-default .un-btn .anticon,
.theme-mauve .un-btn .anticon {
  line-height: 1;
}
```

在`html`中改变 classname 切换主题

```html
<!DOCTYPE html>
<html lang="zh" class="theme-default">
  <head>
    <meta charset="utf-8" />
    <title>title</title>
  </head>
  <body>
    <div id="app"></div>
    <!-- built files will be auto injected -->
  </body>
</html>
```

## 使用 Css Modules

如果是模块化的 less，得到的 css 类似：

```css
.src-components-ContentWrapper-style_theme-default-3CPvz
  .src-components-ContentWrapper-style_content-wrapper-1n85E,
.src-components-ContentWrapper-style_theme-mauve-3yajX
  .src-components-ContentWrapper-style_content-wrapper-1n85E {
  max-width: 1400px;
  margin: 0 auto;
}
```

实际需要的结果应该是这样：

```css
.theme-default .src-components-ContentWrapper-style_content-wrapper-1n85E,
.theme-mauve .src-components-ContentWrapper-style_content-wrapper-1n85E {
  max-width: 1400px;
  margin: 0 auto;
}
```

在 webpack.config.js 需要对`css-loader` (v4.0+) 的 modules 属性修改:

```js
const path = require("path");
const { interpolateName } = require("loader-utils");
function normalizePath(file) {
  return path.sep === "\\" ? file.replace(/\\/g, "/") : file;
}
const multipleScopeVars = [
  {
    scopeName: "theme-default",
    path: path.resolve("src/theme/default-vars.less"),
  },
  {
    scopeName: "theme-mauve",
    path: path.resolve("src/theme/mauve-vars.less"),
  },
];
module.exports = {
  module: {
    rules: [
      {
        test: /\.module.less$/i,
        use: [
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: "[path][name]_[local]-[hash:base64:5]",
                //使用 getLocalIdent 自定义模块化名称 ， css-loader v4.0+
                getLocalIdent: (
                  loaderContext,
                  localIdentName,
                  localName,
                  options
                ) => {
                  if (
                    multipleScopeVars.some(
                      (item) => item.scopeName === localName
                    )
                  ) {
                    //localName 属于 multipleScopeVars 的不用模块化
                    return localName;
                  }
                  const { context, hashPrefix } = options;
                  const { resourcePath } = loaderContext;
                  const request = normalizePath(
                    path.relative(context, resourcePath)
                  );
                  // eslint-disable-next-line no-param-reassign
                  options.content = `${hashPrefix + request}\x00${localName}`;
                  const inname = interpolateName(
                    loaderContext,
                    localIdentName,
                    options
                  );

                  return inname.replace(/\\?\[local\\?]/gi, localName);
                },
              },
            },
          },
          {
            // loader: "less-loader",
            loader: "@zougt/less-loader",
            options: {
              multipleScopeVars,
            },
          },
        ],
      },
    ],
  },
};
```

# **以下是 less-loader 原文档**

<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]
[![cover][cover]][cover-url]
[![chat][chat]][chat-url]
[![size][size]][size-url]

# less-loader

A Less loader for webpack. Compiles Less to CSS.

## Getting Started

To begin, you'll need to install `less` and `less-loader`:

```console
$ npm install less less-loader --save-dev
```

Then add the loader to your `webpack` config. For example:

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        loader: "less-loader", // compiles Less to CSS
      },
    ],
  },
};
```

And run `webpack` via your preferred method.

## Options

|                   Name                    |         Type         |         Default          | Description                                            |
| :---------------------------------------: | :------------------: | :----------------------: | :----------------------------------------------------- |
|     **[`lessOptions`](#lessoptions)**     | `{Object\|Function}` | `{ relativeUrls: true }` | Options for Less.                                      |
|  **[`additionalData`](#additionalData)**  | `{String\|Function}` |       `undefined`        | Prepends/Appends `Less` code to the actual entry file. |
|       **[`sourceMap`](#sourcemap)**       |     `{Boolean}`      |    `compiler.devtool`    | Enables/Disables generation of source maps.            |
| **[`webpackImporter`](#webpackimporter)** |     `{Boolean}`      |          `true`          | Enables/Disables the default Webpack importer.         |
|  **[`implementation`](#implementation)**  |      `{Object}`      |          `less`          | Setup Less implementation to use.                      |

### `lessOptions`

Type: `Object|Function`
Default: `{ relativeUrls: true }`

You can pass any Less specific options to the `less-loader` through the `lessOptions` property in the [loader options](https://webpack.js.org/configuration/module/#rule-options-rule-query). See the [Less documentation](http://lesscss.org/usage/#command-line-usage-options) for all available options in dash-case. Since we're passing these options to Less programmatically, you need to pass them in camelCase here:

#### `Object`

Use an object to pass options through to Less.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                strictMath: true,
              },
            },
          },
        ],
      },
    ],
  },
};
```

#### `Function`

Allows setting the options passed through to Less based off of the loader context.

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "less-loader",
            options: {
              lessOptions: (loaderContext) => {
                // More information about available properties https://webpack.js.org/api/loaders/
                const { resourcePath, rootContext } = loaderContext;
                const relativePath = path.relative(rootContext, resourcePath);

                if (relativePath === "styles/foo.less") {
                  return {
                    paths: ["absolute/path/c", "absolute/path/d"],
                  };
                }

                return {
                  paths: ["absolute/path/a", "absolute/path/b"],
                };
              },
            },
          },
        ],
      },
    ],
  },
};
```

### `additionalData`

Type: `String|Function`
Default: `undefined`

Prepends `Less` code before the actual entry file.
In this case, the `less-loader` will not override the source but just **prepend** the entry's content.

This is especially useful when some of your Less variables depend on the environment:

> ℹ Since you're injecting code, this will break the source mappings in your entry file. Often there's a simpler solution than this, like multiple Less entry files.

#### `String`

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "less-loader",
            options: {
              additionalData: `@env: ${process.env.NODE_ENV};`,
            },
          },
        ],
      },
    ],
  },
};
```

#### `Function`

##### Sync

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "less-loader",
            options: {
              additionalData: (content, loaderContext) => {
                // More information about available properties https://webpack.js.org/api/loaders/
                const { resourcePath, rootContext } = loaderContext;
                const relativePath = path.relative(rootContext, resourcePath);

                if (relativePath === "styles/foo.less") {
                  return "@value: 100px;" + content;
                }

                return "@value: 200px;" + content;
              },
            },
          },
        ],
      },
    ],
  },
};
```

##### Async

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "less-loader",
            options: {
              additionalData: async (content, loaderContext) => {
                // More information about available properties https://webpack.js.org/api/loaders/
                const { resourcePath, rootContext } = loaderContext;
                const relativePath = path.relative(rootContext, resourcePath);

                if (relativePath === "styles/foo.less") {
                  return "@value: 100px;" + content;
                }

                return "@value: 200px;" + content;
              },
            },
          },
        ],
      },
    ],
  },
};
```

### `sourceMap`

Type: `Boolean`
Default: depends on the `compiler.devtool` value

By default generation of source maps depends on the [`devtool`](https://webpack.js.org/configuration/devtool/) option. All values enable source map generation except `eval` and `false` value.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "less-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
};
```

### `webpackImporter`

Type: `Boolean`
Default: `true`

Enables/Disables the default Webpack importer.

This can improve performance in some cases. Use it with caution because aliases and `@import` at-rules starting with `~` will not work.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "less-loader",
            options: {
              webpackImporter: false,
            },
          },
        ],
      },
    ],
  },
};
```

### `implementation`

Type: `Object`

> ⚠ less-loader compatible with Less 3 and 4 versions

The special `implementation` option determines which implementation of Less to use. Overrides the locally installed `peerDependency` version of `less`.

**This option is only really useful for downstream tooling authors to ease the Less 3-to-4 transition.**

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "less-loader",
            options: {
              implementation: require("less"),
            },
          },
        ],
      },
    ],
  },
};
```

## Examples

### Normal usage

Chain the `less-loader` with the [`css-loader`](https://github.com/webpack-contrib/css-loader) and the [`style-loader`](https://github.com/webpack-contrib/style-loader) to immediately apply all styles to the DOM.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          {
            loader: "style-loader", // creates style nodes from JS strings
          },
          {
            loader: "css-loader", // translates CSS into CommonJS
          },
          {
            loader: "less-loader", // compiles Less to CSS
          },
        ],
      },
    ],
  },
};
```

Unfortunately, Less doesn't map all options 1-by-1 to camelCase. When in doubt, [check their executable](https://github.com/less/less.js/blob/3.x/bin/lessc) and search for the dash-case option.

### Source maps

To enable sourcemaps for CSS, you'll need to pass the `sourceMap` property in the loader's options. If this is not passed, the loader will respect the setting for webpack source maps, set in `devtool`.

**webpack.config.js**

```javascript
module.exports = {
  devtool: "source-map", // any "source-map"-like devtool is possible
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "less-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
};
```

If you want to edit the original Less files inside Chrome, [there's a good blog post](https://medium.com/@toolmantim/getting-started-with-css-sourcemaps-and-in-browser-sass-editing-b4daab987fb0). The blog post is about Sass but it also works for Less.

### In production

Usually, it's recommended to extract the style sheets into a dedicated file in production using the [MiniCssExtractPlugin](https://github.com/webpack-contrib/mini-css-extract-plugin). This way your styles are not dependent on JavaScript.

### Imports

Starting with `less-loader` 4, you can now choose between Less' builtin resolver and webpack's resolver. By default, webpack's resolver is used.

#### webpack resolver

webpack provides an [advanced mechanism to resolve files](https://webpack.js.org/configuration/resolve/). The `less-loader` applies a Less plugin that passes all queries to the webpack resolver. Thus you can import your Less modules from `node_modules`. Just prepend them with a `~` which tells webpack to look up the [`modules`](https://webpack.js.org/configuration/resolve/#resolve-modules).

```css
@import "~bootstrap/less/bootstrap";
```

It's important to only prepend it with `~`, because `~/` resolves to the home-directory. webpack needs to distinguish between `bootstrap` and `~bootstrap`, because CSS and Less files have no special syntax for importing relative files. Writing `@import "file"` is the same as `@import "./file";`

#### Less resolver

If you specify the `paths` option, modules will be searched in the given `paths`. This is Less' default behavior. `paths` should be an array with absolute paths:

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.less$/i,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                paths: [path.resolve(__dirname, "node_modules")],
              },
            },
          },
        ],
      },
    ],
  },
};
```

### Plugins

In order to use [plugins](http://lesscss.org/usage/#plugins), simply set the `plugins` option like this:

```js
// webpack.config.js
const CleanCSSPlugin = require('less-plugin-clean-css');

module.exports = {
  ...
    {
      loader: 'less-loader',
      options: {
        lessOptions: {
          plugins: [
            new CleanCSSPlugin({ advanced: true }),
          ],
        },
      },
    },
  ...
};
```

> ℹ️ Access to the [loader context](https://webpack.js.org/api/loaders/#the-loader-context) inside the custom plugin can be done using the `less.webpackLoaderContext` property.

```js
module.exports = {
  install: function (less, pluginManager, functions) {
    functions.add("pi", function () {
      // Loader context is available in `less.webpackLoaderContext`

      return Math.PI;
    });
  },
};
```

### Extracting style sheets

Bundling CSS with webpack has some nice advantages like referencing images and fonts with hashed urls or [hot module replacement](https://webpack.js.org/concepts/hot-module-replacement/) in development. In production, on the other hand, it's not a good idea to apply your style sheets depending on JS execution. Rendering may be delayed or even a [FOUC](https://en.wikipedia.org/wiki/Flash_of_unstyled_content) might be visible. Thus it's often still better to have them as separate files in your final production build.

There are two possibilities to extract a style sheet from the bundle:

- [`extract-loader`](https://github.com/peerigon/extract-loader) (simpler, but specialized on the css-loader's output)
- [MiniCssExtractPlugin](https://github.com/webpack-contrib/mini-css-extract-plugin) (more complex, but works in all use-cases)

### CSS modules gotcha

There is a known problem with Less and [CSS modules](https://github.com/css-modules/css-modules) regarding relative file paths in `url(...)` statements. [See this issue for an explanation](https://github.com/webpack-contrib/less-loader/issues/109#issuecomment-253797335).

## Contributing

Please take a moment to read our contributing guidelines if you haven't yet done so.

[CONTRIBUTING](./.github/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/less-loader.svg
[npm-url]: https://npmjs.com/package/less-loader
[node]: https://img.shields.io/node/v/less-loader.svg
[node-url]: https://nodejs.org
[deps]: https://david-dm.org/webpack-contrib/less-loader.svg
[deps-url]: https://david-dm.org/webpack-contrib/less-loader
[tests]: https://github.com/webpack-contrib/less-loader/workflows/less-loader/badge.svg
[tests-url]: https://github.com/webpack-contrib/less-loader/actions
[cover]: https://codecov.io/gh/webpack-contrib/less-loader/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/webpack-contrib/less-loader
[chat]: https://img.shields.io/badge/gitter-webpack%2Fwebpack-brightgreen.svg
[chat-url]: https://gitter.im/webpack/webpack
[size]: https://packagephobia.now.sh/badge?p=less-loader
[size-url]: https://packagephobia.now.sh/result?p=less-loader
