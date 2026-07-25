import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__ from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

var __webpack_modules__ = {
  "./示例/角色卡示例/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      Schema: () => Schema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    const Schema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      世界: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        当前时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        当前地点: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        近期事务: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("事务名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("事务描述"))
      }),
      白娅: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        依存度: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)),
        着装: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "上装", "下装", "内衣", "袜子", "鞋子", "饰品" ]), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("服装描述")),
        称号: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("称号名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          效果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
          自我评价: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
        }))
      }).transform(data => {
        const $依存度阶段 = data.依存度 < 20 ? "消极自毁" : data.依存度 < 40 ? "渴求注视" : data.依存度 < 60 ? "暗中靠近" : data.依存度 < 80 ? "忐忑相依" : "柔软依存";
        data.称号 = _(data.称号).entries().takeRight(Math.ceil(data.依存度 / 10)).fromPairs().value();
        return {
          ...data,
          $依存度阶段
        };
      }),
      主角: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        物品栏: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("物品名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
          数量: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number()
        })).transform(data => _.pickBy(data, ({数量}) => 数量 > 0))
      })
    });
  },
  "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js"(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__;
  },
  zod(module) {
    module.exports = z;
  }
};

const __webpack_module_cache__ = {};

function __webpack_require__(moduleId) {
  const cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  const module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  if (!(moduleId in __webpack_modules__)) {
    delete __webpack_module_cache__[moduleId];
    const e = new Error("Cannot find module '" + moduleId + "'");
    e.code = "MODULE_NOT_FOUND";
    throw e;
  }
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}

(() => {
  __webpack_require__.n = module => {
    const getter = module && module.__esModule ? () => module["default"] : () => module;
    __webpack_require__.d(getter, {
      a: getter
    });
    return getter;
  };
})();

(() => {
  __webpack_require__.d = (exports, definition) => {
    if (Array.isArray(definition)) {
      var i = 0;
      while (i < definition.length) {
        var key = definition[i++];
        var binding = definition[i++];
        if (!__webpack_require__.o(exports, key)) {
          if (binding === 0) {
            Object.defineProperty(exports, key, {
              enumerable: true,
              value: definition[i++]
            });
          } else {
            Object.defineProperty(exports, key, {
              enumerable: true,
              get: binding
            });
          }
        } else if (binding === 0) {
          i++;
        }
      }
    } else {
      for (var key in definition) {
        if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: definition[key]
          });
        }
      }
    }
  };
})();

(() => {
  __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
})();

(() => {
  __webpack_require__.r = exports => {
    if (Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: "Module"
      });
    }
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
  };
})();

let __webpack_exports__ = {};

(() => {
  /*!***********************************!*\
  !*** ./示例/角色卡示例/脚本/变量结构/index.ts ***!
  \***********************************/
  __webpack_require__.r(__webpack_exports__);
  var https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js */ "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js");
  var _schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../schema */ "./示例/角色卡示例/schema.ts");
  $(() => {
    (0, https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__.registerMvuSchema)(_schema__WEBPACK_IMPORTED_MODULE_1__.Schema);
  });
})();