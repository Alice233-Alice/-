import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_dedent_esm_422736dc__ from "https://testingcf.jsdelivr.net/npm/dedent/+esm";

import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_klona_esm_74666e88__ from "https://testingcf.jsdelivr.net/npm/klona/+esm";

import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_pinia_esm_b723a504__ from "https://testingcf.jsdelivr.net/npm/pinia/+esm";

var __webpack_modules__ = {
  "./util/iframe_srcdoc.html"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      default: () => __WEBPACK_DEFAULT_EXPORT__
    });
    var code = `<!DOCTYPE html>\n<html>\n<head>\n<link rel="stylesheet" href="https://testingcf.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css"></link>\n${"<" + "script"} src="https://testingcf.jsdelivr.net/gh/n0vi028/JS-Slash-Runner/lib/tailwindcss.min.js">${"<" + "/script"}>\n${"<" + "script"} src="https://testingcf.jsdelivr.net/npm/jquery">${"<" + "/script"}>\n${"<" + "script"} src="https://testingcf.jsdelivr.net/npm/jquery-ui/dist/jquery-ui.min.js">${"<" + "/script"}>\n<link rel="stylesheet" href="https://testingcf.jsdelivr.net/npm/jquery-ui/themes/base/theme.min.css" />\n${"<" + "script"} src="https://testingcf.jsdelivr.net/npm/jquery-ui-touch-punch">${"<" + "/script"}>\n${"<" + "script"} src="https://testingcf.jsdelivr.net/npm/lodash">${"<" + "/script"}>\n${"<" + "script"} src="https://testingcf.jsdelivr.net/gh/n0vi028/JS-Slash-Runner/src/iframe/adjust_iframe_height.js">${"<" + "/script"}>\n<style>\n*,*::before,*::after{box-sizing:border-box;}\nhtml,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;}\n</style>\n</head>\n<html>\n`;
    const __WEBPACK_DEFAULT_EXPORT__ = code;
  },
  "./util/script.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      createScriptIdDiv: () => createScriptIdDiv,
      createScriptIdIframe: () => createScriptIdIframe,
      loadReadme: () => loadReadme,
      reloadOnChatChange: () => reloadOnChatChange,
      teleportStyle: () => teleportStyle
    });
    var _iframe_srcdoc_html__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./iframe_srcdoc.html */ "./util/iframe_srcdoc.html");
    async function loadReadme(url) {
      const readme = await fetch(url);
      if (!readme.ok) {
        return false;
      }
      const readme_text = await readme.text();
      replaceScriptInfo(readme_text);
      return true;
    }
    function teleportStyle(append_to = "head") {
      const $div = $(`<div>`).attr("script_id", getScriptId()).append($(`head > style`, document).clone()).appendTo(append_to);
      return {
        destroy: () => $div.remove()
      };
    }
    function createScriptIdIframe() {
      return $(`<iframe>`).attr({
        script_id: getScriptId(),
        frameborder: 0,
        srcdoc: _iframe_srcdoc_html__WEBPACK_IMPORTED_MODULE_0__["default"]
      });
    }
    function createScriptIdDiv() {
      return $("<div>").attr("script_id", getScriptId());
    }
    function reloadOnChatChange() {
      let chat_id = SillyTavern.getCurrentChatId();
      return eventOn(tavern_events.CHAT_CHANGED, new_chat_id => {
        if (chat_id !== new_chat_id) {
          chat_id = new_chat_id;
          window.location.reload();
        }
      });
    }
  },
  "./示例/脚本示例/settings.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      useSettingsStore: () => useSettingsStore
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var pinia__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! pinia */ "pinia");
    var vue__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! vue */ "vue");
    var vue__WEBPACK_IMPORTED_MODULE_2___default = __webpack_require__.n(vue__WEBPACK_IMPORTED_MODULE_2__);
    var klona__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! klona */ "klona");
    const Settings = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      button_selected: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().default(false)
    }).prefault({});
    const useSettingsStore = (0, pinia__WEBPACK_IMPORTED_MODULE_1__.defineStore)("settings", () => {
      const settings = (0, vue__WEBPACK_IMPORTED_MODULE_2__.ref)(Settings.parse(getVariables({
        type: "script",
        script_id: getScriptId()
      })));
      (0, vue__WEBPACK_IMPORTED_MODULE_2__.watchEffect)(() => {
        insertOrAssignVariables((0, klona__WEBPACK_IMPORTED_MODULE_3__.klona)(settings.value), {
          type: "script",
          script_id: getScriptId()
        });
      });
      return {
        settings
      };
    });
  },
  "./示例/脚本示例/加载和卸载时执行函数.ts"() {
    $(() => {
      toastr.success("你已经成功加载示例脚本!", "恭喜你!");
    });
    $(window).on("pagehide", () => {
      toastr.info("你已经卸载示例脚本!", "再见!");
    });
  },
  "./示例/脚本示例/添加按钮和注册按钮事件.ts"() {
    $(() => {
      replaceScriptButtons([ {
        name: "晚上好",
        visible: true
      } ]);
      eventOn(getButtonEvent("晚上好"), () => {
        toastr.warning("晚安, 络络");
      });
    });
  },
  "./示例/脚本示例/监听消息修改.ts"() {
    eventOn(tavern_events.MESSAGE_UPDATED, message_id => {
      toastr.error(`谁让你动我第 ${message_id} 楼消息的😡`, `干什么!`);
    });
  },
  "./示例/脚本示例/聊天文件变更时重载脚本.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    var _util_script__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @util/script */ "./util/script.ts");
    (0, _util_script__WEBPACK_IMPORTED_MODULE_0__.reloadOnChatChange)();
  },
  "./示例/脚本示例/设置界面.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    var _util_script__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @util/script */ "./util/script.ts");
    var _vue__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./设置界面.vue */ "./示例/脚本示例/设置界面.vue");
    var vue__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! vue */ "vue");
    var vue__WEBPACK_IMPORTED_MODULE_2___default = __webpack_require__.n(vue__WEBPACK_IMPORTED_MODULE_2__);
    var pinia__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! pinia */ "pinia");
    $(() => {
      const app = (0, vue__WEBPACK_IMPORTED_MODULE_2__.createApp)(_vue__WEBPACK_IMPORTED_MODULE_1__["default"]).use((0, 
      pinia__WEBPACK_IMPORTED_MODULE_3__.createPinia)());
      const $app = (0, _util_script__WEBPACK_IMPORTED_MODULE_0__.createScriptIdDiv)().appendTo("#extensions_settings2");
      app.mount($app[0]);
      const {destroy} = (0, _util_script__WEBPACK_IMPORTED_MODULE_0__.teleportStyle)();
      $(window).on("pagehide", () => {
        app.unmount();
        $app.remove();
        destroy();
      });
    });
  },
  "./示例/脚本示例/调整消息楼层.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    var dedent__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! dedent */ "dedent");
    "use strict";
    $(async () => {
      const message_id = getLastMessageId();
      if (message_id !== 0) {
        return;
      }
      await createChatMessages([ {
        role: "assistant",
        message: (0, dedent__WEBPACK_IMPORTED_MODULE_0__["default"])(`\n                   [查看日记: 这是第二次看我的日记了呢~]\n                   <roleplay_options>\n                   接受日记本并翻阅: 青空黎接过她递来的粉色日记本，在天台阳光下缓缓翻开第一页\n                   保持沉默盯着她看: 青空黎没有接本子，只是盯着她略显紧张的表情和轻颤的声音\n                   坐到她身边: 青空黎没有立刻回应，而是缓缓走到络络身边坐下，等待她自己继续说\n                   开玩笑化解气氛: 青空黎微微一笑，开玩笑地说「所以，是要让我当监督官啦？」\n                   跳过时间: 青空黎接过日记本，安静地翻了几页，时间悄然流逝至黄昏深处\n                   和络络聊天: 青空黎试探性地问：「这本是从哪天开始写的？都写些什么呀？」\n                   </roleplay_options>\n                 `)
      }, {
        role: "assistant",
        message: (0, dedent__WEBPACK_IMPORTED_MODULE_0__["default"])(`\n                   [查看日记: 真是的, 就这么喜欢看吗(v〃ω〃)]\n                   <roleplay_options>\n                   阅读日记第一页：青空黎打开粉色的日记本，从第一页开始认真阅读络络的记录内容。\n                   问她封面上的兔子贴纸：青空黎好奇那枚蓝色兔子贴纸的来历，转头向络络询问。\n                   观察络络的小动作：青空黎不急着翻开日记，而是注意到络络表情里一丝期待与不安。\n                   和她闲聊天气：青空黎随口聊起傍晚风有点凉，试图舒缓紧张气氛。\n                   调侃她：“有哪页是‘不许看’的？”青空黎轻松地试图化解她的小慌乱。\n                   转身回教室：青空黎接过日记却并未立刻翻开，而是表示回教室再看，打算慢慢阅读。\n                   </roleplay_options>\n                 `)
      } ], {
        refresh: "all"
      });
    });
  },
  "./node_modules/.pnpm/unplugin@3.3.0_webpack@5.108.3/node_modules/unplugin/dist/webpack/loaders/transform.mjs??unplugin-vue-components!./node_modules/.pnpm/unplugin@2.3.11/node_modules/unplugin/dist/webpack/loaders/transform.js??unplugin-auto-import!./node_modules/.pnpm/ts-loader@9.6.2_loader-util_649f1bfcf207cacd37d5693f779dd06d/node_modules/ts-loader/index.js??clonedRuleSet-734!./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[6].use[0]!./示例/脚本示例/设置界面.vue?vue&type=script&setup=true&lang=ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      default: () => __WEBPACK_DEFAULT_EXPORT__
    });
    var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "vue");
    var vue__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(vue__WEBPACK_IMPORTED_MODULE_0__);
    var pinia__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! pinia */ "pinia");
    var _settings__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./settings */ "./示例/脚本示例/settings.ts");
    const __WEBPACK_DEFAULT_EXPORT__ = (0, vue__WEBPACK_IMPORTED_MODULE_0__.defineComponent)({
      __name: "设置界面",
      setup(__props, {expose: __expose}) {
        __expose();
        const {settings} = (0, pinia__WEBPACK_IMPORTED_MODULE_1__.storeToRefs)((0, _settings__WEBPACK_IMPORTED_MODULE_2__.useSettingsStore)());
        const handle_button_click = () => {
          toastr.success("你好呀!");
        };
        const __returned__ = {
          settings,
          handle_button_click
        };
        Object.defineProperty(__returned__, "__isScriptSetup", {
          enumerable: false,
          value: true
        });
        return __returned__;
      }
    });
  },
  "./node_modules/.pnpm/unplugin@3.3.0_webpack@5.108.3/node_modules/unplugin/dist/webpack/loaders/transform.mjs??unplugin-vue-components!./node_modules/.pnpm/unplugin@2.3.11/node_modules/unplugin/dist/webpack/loaders/transform.js??unplugin-auto-import!./node_modules/.pnpm/ts-loader@9.6.2_loader-util_649f1bfcf207cacd37d5693f779dd06d/node_modules/ts-loader/index.js??clonedRuleSet-734!./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[4]!./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[6].use[0]!./示例/脚本示例/设置界面.vue?vue&type=template&id=b3bade7c&ts=true"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      render: () => render
    });
    var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "vue");
    var vue__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(vue__WEBPACK_IMPORTED_MODULE_0__);
    const _hoisted_1 = {
      class: "example-extension-settings"
    };
    const _hoisted_2 = {
      class: "inline-drawer"
    };
    const _hoisted_3 = {
      class: "inline-drawer-content"
    };
    const _hoisted_4 = {
      class: "example-extension_block flex-container"
    };
    function render(_ctx, _cache, $props, $setup, $data, $options) {
      return (0, vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0, vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_1, [ (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [ _cache[3] || (_cache[3] = (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
        class: "inline-drawer-toggle inline-drawer-header"
      }, [ (0, vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("b", null, (0, vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(`脚本示例`)), (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
        class: "inline-drawer-icon fa-solid fa-circle-chevron-down down"
      }) ], -1)), (0, vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_3, [ (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
        class: "example-extension_block flex-container"
      }, [ (0, vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
        class: "menu_button",
        type: "submit",
        value: `示例按钮`,
        onClick: $setup.handle_button_click
      }) ]), (0, vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [ (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0, vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
        "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => $setup.settings.button_selected = $event),
        type: "checkbox"
      }, null, 512), [ [ vue__WEBPACK_IMPORTED_MODULE_0__.vModelCheckbox, $setup.settings.button_selected ] ]), _cache[1] || (_cache[1] = (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", {
        for: "example_setting"
      }, (0, vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(`示例开关`), -1)) ]), _cache[2] || (_cache[2] = (0, 
      vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("hr", {
        class: "sysHR"
      }, null, -1)) ]) ]) ]);
    }
  },
  "./示例/脚本示例/设置界面.vue"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      default: () => __WEBPACK_DEFAULT_EXPORT__
    });
    var _vue_vue_type_template_id_b3bade7c_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./设置界面.vue?vue&type=template&id=b3bade7c&ts=true */ "./示例/脚本示例/设置界面.vue?vue&type=template&id=b3bade7c&ts=true");
    var _vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./设置界面.vue?vue&type=script&setup=true&lang=ts */ "./示例/脚本示例/设置界面.vue?vue&type=script&setup=true&lang=ts");
    var _node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/exportHelper.js");
    const __exports__ = (0, _node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__["default"], [ [ "render", _vue_vue_type_template_id_b3bade7c_ts_true__WEBPACK_IMPORTED_MODULE_0__.render ], [ "__file", "示例/脚本示例/设置界面.vue" ] ]);
    if (false) {}
    const __WEBPACK_DEFAULT_EXPORT__ = __exports__;
  },
  "./示例/脚本示例/设置界面.vue?vue&type=script&setup=true&lang=ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      default: () => _node_modules_pnpm_unplugin_3_3_0_webpack_5_108_3_node_modules_unplugin_dist_webpack_loaders_transform_mjs_unplugin_vue_components_node_modules_pnpm_unplugin_2_3_11_node_modules_unplugin_dist_webpack_loaders_transform_js_unplugin_auto_import_node_modules_pnpm_ts_loader_9_6_2_loader_util_649f1bfcf207cacd37d5693f779dd06d_node_modules_ts_loader_index_js_clonedRuleSet_734_node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_6_use_0_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__["default"]
    });
    var _node_modules_pnpm_unplugin_3_3_0_webpack_5_108_3_node_modules_unplugin_dist_webpack_loaders_transform_mjs_unplugin_vue_components_node_modules_pnpm_unplugin_2_3_11_node_modules_unplugin_dist_webpack_loaders_transform_js_unplugin_auto_import_node_modules_pnpm_ts_loader_9_6_2_loader_util_649f1bfcf207cacd37d5693f779dd06d_node_modules_ts_loader_index_js_clonedRuleSet_734_node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_6_use_0_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../node_modules/.pnpm/unplugin@3.3.0_webpack@5.108.3/node_modules/unplugin/dist/webpack/loaders/transform.mjs??unplugin-vue-components!../../node_modules/.pnpm/unplugin@2.3.11/node_modules/unplugin/dist/webpack/loaders/transform.js??unplugin-auto-import!../../node_modules/.pnpm/ts-loader@9.6.2_loader-util_649f1bfcf207cacd37d5693f779dd06d/node_modules/ts-loader/index.js??clonedRuleSet-734!../../node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[6].use[0]!./设置界面.vue?vue&type=script&setup=true&lang=ts */ "./node_modules/.pnpm/unplugin@3.3.0_webpack@5.108.3/node_modules/unplugin/dist/webpack/loaders/transform.mjs??unplugin-vue-components!./node_modules/.pnpm/unplugin@2.3.11/node_modules/unplugin/dist/webpack/loaders/transform.js??unplugin-auto-import!./node_modules/.pnpm/ts-loader@9.6.2_loader-util_649f1bfcf207cacd37d5693f779dd06d/node_modules/ts-loader/index.js??clonedRuleSet-734!./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[6].use[0]!./示例/脚本示例/设置界面.vue?vue&type=script&setup=true&lang=ts");
  },
  "./示例/脚本示例/设置界面.vue?vue&type=template&id=b3bade7c&ts=true"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      render: () => _node_modules_pnpm_unplugin_3_3_0_webpack_5_108_3_node_modules_unplugin_dist_webpack_loaders_transform_mjs_unplugin_vue_components_node_modules_pnpm_unplugin_2_3_11_node_modules_unplugin_dist_webpack_loaders_transform_js_unplugin_auto_import_node_modules_pnpm_ts_loader_9_6_2_loader_util_649f1bfcf207cacd37d5693f779dd06d_node_modules_ts_loader_index_js_clonedRuleSet_734_node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_4_node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_6_use_0_vue_vue_type_template_id_b3bade7c_ts_true__WEBPACK_IMPORTED_MODULE_0__.render
    });
    var _node_modules_pnpm_unplugin_3_3_0_webpack_5_108_3_node_modules_unplugin_dist_webpack_loaders_transform_mjs_unplugin_vue_components_node_modules_pnpm_unplugin_2_3_11_node_modules_unplugin_dist_webpack_loaders_transform_js_unplugin_auto_import_node_modules_pnpm_ts_loader_9_6_2_loader_util_649f1bfcf207cacd37d5693f779dd06d_node_modules_ts_loader_index_js_clonedRuleSet_734_node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_4_node_modules_pnpm_vue_loader_17_4_2_vue_comp_0fcc74eb884311066ff818d47de2b3e0_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_6_use_0_vue_vue_type_template_id_b3bade7c_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../node_modules/.pnpm/unplugin@3.3.0_webpack@5.108.3/node_modules/unplugin/dist/webpack/loaders/transform.mjs??unplugin-vue-components!../../node_modules/.pnpm/unplugin@2.3.11/node_modules/unplugin/dist/webpack/loaders/transform.js??unplugin-auto-import!../../node_modules/.pnpm/ts-loader@9.6.2_loader-util_649f1bfcf207cacd37d5693f779dd06d/node_modules/ts-loader/index.js??clonedRuleSet-734!../../node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[4]!../../node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[6].use[0]!./设置界面.vue?vue&type=template&id=b3bade7c&ts=true */ "./node_modules/.pnpm/unplugin@3.3.0_webpack@5.108.3/node_modules/unplugin/dist/webpack/loaders/transform.mjs??unplugin-vue-components!./node_modules/.pnpm/unplugin@2.3.11/node_modules/unplugin/dist/webpack/loaders/transform.js??unplugin-auto-import!./node_modules/.pnpm/ts-loader@9.6.2_loader-util_649f1bfcf207cacd37d5693f779dd06d/node_modules/ts-loader/index.js??clonedRuleSet-734!./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[4]!./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[6].use[0]!./示例/脚本示例/设置界面.vue?vue&type=template&id=b3bade7c&ts=true");
  },
  "./node_modules/.pnpm/vue-loader@17.4.2_@vue+comp_0fcc74eb884311066ff818d47de2b3e0/node_modules/vue-loader/dist/exportHelper.js"(__unused_webpack_module, exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = (sfc, props) => {
      const target = sfc.__vccOpts || sfc;
      for (const [key, val] of props) {
        target[key] = val;
      }
      return target;
    };
  },
  dedent(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_dedent_esm_422736dc__;
  },
  klona(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_klona_esm_74666e88__;
  },
  pinia(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_pinia_esm_b723a504__;
  },
  vue(module) {
    module.exports = Vue;
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
  /*!**************************!*\
  !*** ./示例/脚本示例/index.ts ***!
  \**************************/
  __webpack_require__.r(__webpack_exports__);
  var ___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./加载和卸载时执行函数 */ "./示例/脚本示例/加载和卸载时执行函数.ts");
  var ___WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(___WEBPACK_IMPORTED_MODULE_0__);
  var ___WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./添加按钮和注册按钮事件 */ "./示例/脚本示例/添加按钮和注册按钮事件.ts");
  var ___WEBPACK_IMPORTED_MODULE_1___default = __webpack_require__.n(___WEBPACK_IMPORTED_MODULE_1__);
  var ___WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./监听消息修改 */ "./示例/脚本示例/监听消息修改.ts");
  var ___WEBPACK_IMPORTED_MODULE_2___default = __webpack_require__.n(___WEBPACK_IMPORTED_MODULE_2__);
  var ___WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./聊天文件变更时重载脚本 */ "./示例/脚本示例/聊天文件变更时重载脚本.ts");
  var ___WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./设置界面 */ "./示例/脚本示例/设置界面.ts");
  var ___WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./调整消息楼层 */ "./示例/脚本示例/调整消息楼层.ts");
})();