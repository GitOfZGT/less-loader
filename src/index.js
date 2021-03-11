import path from "path";

import less from "less";

import schema from "./options.json";
import {
  getLessOptions,
  isUnsupportedUrl,
  normalizeSourceMap,
  getScropProcessResult,
  getAllStyleVarFiles,
  getVarsContent,
} from "./utils";
import LessError from "./LessError";

async function lessLoader(source) {
  const options = this.getOptions(schema);
  const callback = this.async();
  const lessOptions = getLessOptions(this, options);
  const useSourceMap =
    typeof options.sourceMap === "boolean" ? options.sourceMap : this.sourceMap;

  if (useSourceMap) {
    lessOptions.sourceMap = {
      outputSourceFiles: true,
    };
  }

  let data = source;

  if (typeof options.additionalData !== "undefined") {
    data =
      typeof options.additionalData === "function"
        ? `${await options.additionalData(data, this)}`
        : `${options.additionalData}\n${data}`;
  }

  let result;
  const preProcessor = (code) =>
    (options.implementation || less).render(code, lessOptions);
  const allStyleVarFiles = getAllStyleVarFiles(this, options);
  try {
    // result = await (options.implementation || less).render(data, lessOptions);
    result = await Promise.all(
      allStyleVarFiles.map((file) => {
        const varscontent = getVarsContent(file.path);
        return preProcessor(`${data}\n${varscontent}`, lessOptions);
      })
    ).then((prs) =>
      getScropProcessResult(
        prs.map((item) => {
          return { ...item, code: item.css, deps: item.imports };
        }),
        allStyleVarFiles
      )
    );
  } catch (error) {
    if (error && error.filename) {
      // `less` returns forward slashes on windows when `webpack` resolver return an absolute windows path in `WebpackFileManager`
      // Ref: https://github.com/webpack-contrib/less-loader/issues/357
      this.addDependency(path.normalize(error.filename));
    }

    callback(new LessError(error));

    return;
  }

  // const { css, imports } = result;
  const css = result.code;
  const imports = result.deps;
  imports.forEach((item) => {
    if (isUnsupportedUrl(item)) {
      return;
    }

    // `less` return forward slashes on windows when `webpack` resolver return an absolute windows path in `WebpackFileManager`
    // Ref: https://github.com/webpack-contrib/less-loader/issues/357
    this.addDependency(path.normalize(item));
  });

  let map =
    typeof result.map === "string" ? JSON.parse(result.map) : result.map;

  if (map && useSourceMap) {
    map = normalizeSourceMap(map, this.rootContext);
  }

  callback(null, css, map);
}

export default lessLoader;
