import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__ from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

var __webpack_modules__ = {
  "./src/灯火阑珊-变量结构/guard.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      applyRealmTransitionGuards: () => applyRealmTransitionGuards,
      correctProtagonistRealmText: () => correctProtagonistRealmText,
      guardParsedCommands: () => guardParsedCommands,
      installAuthoritativeMvuGuard: () => installAuthoritativeMvuGuard,
      repairStatDataWithFallback: () => repairStatDataWithFallback
    });
    var _schema__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../灯火阑珊/schema */ "./src/灯火阑珊/schema.ts");
    const GUARD_INSTALLED_KEY = "__灯火阑珊_authoritative_mvu_guard_installed__";
    const READONLY_ENTITY_FIELDS = new Set([ "突破阈值", "寿元上限", "境界描述", "寿元状态", "状态", "进度", "战力值" ]);
    const MVU_ROOT_KEYS = [ "世界时钟", "世界地图", "世界图志", "宗门势力库", "功法库", "法宝库", "地点库", "$宗门推断", "灵根库", "体质库", "本尊", "红颜角色库", "红颜", "NPC图鉴", "任务列表", "声望系统", "难度系统", "可参与机遇", "当前处境", "_系统设置", "_好感度快照" ];
    const COMPANION_CANONICAL_NAMES = {
      虞汐: "虞汐颜",
      虞颜: "虞汐颜",
      阿鸢: "朔璃鸢",
      血手飞鸢: "朔璃鸢",
      赤月女帝: "朔望舒",
      幽影宗主: "朔望舒",
      念迟迟: "安迟迟",
      蘅之: "安迟迟",
      拈韵居士: "安迟迟",
      掌籍师姐: "安迟迟"
    };
    const TRADITIONAL_PATH_ALIASES = {
      世界時鐘: "世界时钟",
      世界地圖: "世界地图",
      世界圖志: "世界图志",
      宗門勢力庫: "宗门势力库",
      功法庫: "功法库",
      法寶庫: "法宝库",
      地點庫: "地点库",
      靈根庫: "灵根库",
      體質庫: "体质库",
      紅顏角色庫: "红颜角色库",
      紅顏: "红颜",
      聲望系統: "声望系统",
      難度系統: "难度系统",
      危險度: "危险度",
      當前區域: "当前区域",
      所屬層級: "所属层级",
      當前處境: "当前处境",
      可參與機遇: "可参与机遇",
      任務列表: "任务列表"
    };
    const EMPTY_REALM_TRANSITION = {
      类型: "无",
      目标等级: 0,
      依据: ""
    };
    const REALM_TEXT_PATTERN = new RegExp(`(${_schema__WEBPACK_IMPORTED_MODULE_0__.REALM_NAMES.join("|")})(${_schema__WEBPACK_IMPORTED_MODULE_0__.REALM_STAGES.join("|")})`, "gu");
    const pendingExplicitLevels = new Map;
    let lastValidStatData = null;
    function normalizeCommandPath(rawPath) {
      let path = String(rawPath || "").trim();
      if (!path) return path;
      if (path.startsWith("./")) path = path.slice(1);
      if (path.startsWith("/")) {
        path = path.replace(/^\/+/, "").replaceAll("/", ".");
      }
      path = path.replaceAll("：", ":").replaceAll("。", ".").replace(/\s+/gu, "").replace(/\.\.+/gu, ".");
      for (const [from, to] of Object.entries(TRADITIONAL_PATH_ALIASES)) {
        path = path.replaceAll(from, to);
      }
      if (!path.startsWith("stat_data.") && MVU_ROOT_KEYS.some(rootKey => path === rootKey || path.startsWith(`${rootKey}.`))) {
        path = `stat_data.${path}`;
      }
      return path;
    }
    function normalizeCompanionAliasPath(path) {
      const match = path.match(/^stat_data\.(红颜|红颜角色库|_好感度快照)\.([^./]+)(?=\.|$)/u);
      if (!match) return path;
      const [, section, companionName] = match;
      const canonicalName = COMPANION_CANONICAL_NAMES[companionName];
      return canonicalName ? path.replace(`stat_data.${section}.${companionName}`, `stat_data.${section}.${canonicalName}`) : path;
    }
    function getCommandValueArgIndex(command) {
      switch (command.type) {
       case "set":
       case "insert":
        return command.args.length >= 3 ? 2 : command.args.length >= 2 ? 1 : null;

       case "add":
        return command.args.length >= 2 ? 1 : null;

       default:
        return null;
      }
    }
    function coerceByPath(path, value) {
      if (path === "stat_data.可参与机遇") {
        const unwrapped = (0, _schema__WEBPACK_IMPORTED_MODULE_0__.unwrapOpportunityPatchPayload)(value);
        if (Array.isArray(unwrapped)) {
          return typeof value === "string" ? JSON.stringify(unwrapped) : unwrapped;
        }
      }
      if (path.endsWith("熟练度") && typeof value === "string") {
        const normalized = value.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/gu, "");
        if (normalized.includes("小成")) return "熟练";
        if (normalized.includes("中成")) return "精通";
        if (normalized.includes("大圆满")) return "圆满";
      }
      return value;
    }
    function isReadonlyDerivedStatPath(path) {
      const entityFieldMatch = path.match(/^stat_data\.(?:本尊|红颜\.[^./]+)\.([^./]+)$/u);
      if (entityFieldMatch && READONLY_ENTITY_FIELDS.has(entityFieldMatch[1])) return true;
      return /^stat_data\.(?:本尊|红颜\.[^./]+)\.修炼状态\.突破目标$/u.test(path) || /^stat_data\.(?:本尊|红颜\.[^./]+)\.神通列表\.[^./]+\.威力等级$/u.test(path) || /^stat_data\.法宝库\.[^./]+\.特$/u.test(path) || /^stat_data\.灵根库\.[^./]+\.(?:速|特)$/u.test(path) || /^stat_data\.体质库\.[^./]+\.优$/u.test(path) || /^stat_data\._系统设置\.(?:修炼系统版本|变量结构版本)$/u.test(path);
    }
    function getReadonlyDerivedPathValue(path, variables) {
      const parsed = _schema__WEBPACK_IMPORTED_MODULE_0__.Schema.safeParse(_.get(variables, "stat_data"));
      if (parsed.success) {
        return _.get({
          stat_data: parsed.data
        }, path);
      }
      return _.get(variables, path);
    }
    function rewriteReadonlyDerivedCommand(command, path, variables) {
      if (!isReadonlyDerivedStatPath(path)) return false;
      const currentValue = getReadonlyDerivedPathValue(path, variables);
      if (typeof currentValue === "undefined") return false;
      command.type = "set";
      command.args = [ path, JSON.stringify(currentValue) ];
      command.reason = "只读派生字段被权威变量守卫改写为 no-op";
      return true;
    }
    function rememberExplicitLevel(command, path, value, variables) {
      if (!/^stat_data\.(?:本尊|红颜\.[^./]+)\.等级$/u.test(path)) return;
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return;
      const absoluteLevel = command.type === "add" ? Number(_.get(variables, path, 1)) + numericValue : numericValue;
      pendingExplicitLevels.set(path, (0, _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeRealmLevel)(absoluteLevel));
    }
    function applyPendingExplicitLevels(newVariables) {
      for (const [path, level] of pendingExplicitLevels.entries()) {
        if (_.has(newVariables, path.replace(/^stat_data\./u, "stat_data."))) {
          _.set(newVariables, path, level);
        }
      }
    }
    function tryParseLiteralObject(input) {
      if (typeof input !== "string") return null;
      try {
        const parsed = JSON.parse(input);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    function getExistingCompanionSource(path, variables) {
      const currentValue = _.get(variables, path);
      if (currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)) {
        return _.cloneDeep(currentValue);
      }
      try {
        const snapshotValue = _.get(lastValidStatData, path.replace(/^stat_data\./u, ""));
        return snapshotValue && typeof snapshotValue === "object" && !Array.isArray(snapshotValue) ? _.cloneDeep(snapshotValue) : null;
      } catch {
        return null;
      }
    }
    function rewriteDuplicateCompanionInsert(command, path, variables) {
      if (command.type !== "insert" || !/^stat_data\.红颜\.[^./]+$/u.test(path)) return [];
      const existing = getExistingCompanionSource(path, variables);
      const valueArgIndex = getCommandValueArgIndex(command);
      const incoming = valueArgIndex === null ? null : tryParseLiteralObject(command.args[valueArgIndex]);
      if (!existing || !incoming) return [];
      const companionName = path.split(".").at(-1) ?? "未知角色";
      const appendedCommands = [];
      if (_.has(incoming, "好感度")) {
        const oldFavor = Number(_.get(existing, "好感度", 0));
        const newFavor = Number(_.get(incoming, "好感度", oldFavor));
        if (Number.isFinite(oldFavor) && Number.isFinite(newFavor) && oldFavor !== newFavor) {
          appendedCommands.push({
            type: "add",
            full_match: `guard:add:${companionName}:好感度`,
            args: [ `${path}.好感度`, String(newFavor - oldFavor) ],
            reason: "已存在红颜的重复 insert 已改写为好感增量"
          });
        }
      }
      const replaceableKeys = [ "关系", "关系上下文", "灵根", "体质", "功法", "本命兵器", "等级", "修为", "灵石", "已活岁月", "尝试突破", "修炼状态", "神通列表" ];
      for (const key of replaceableKeys) {
        if (!_.has(incoming, key) || _.isEqual(_.get(incoming, key), _.get(existing, key))) continue;
        appendedCommands.push({
          type: "set",
          full_match: `guard:set:${companionName}:${key}`,
          args: [ `${path}.${key}`, JSON.stringify(_.get(incoming, key)) ],
          reason: "已存在红颜的重复 insert 已改写为字段更新"
        });
      }
      command.type = "set";
      command.args = [ path, JSON.stringify(existing) ];
      command.reason = "已存在红颜的重复 insert 原命令已改写为 no-op";
      return appendedCommands;
    }
    function normalizeTransition(raw) {
      return _schema__WEBPACK_IMPORTED_MODULE_0__.RealmTransitionSchema.parse(raw ?? EMPTY_REALM_TRANSITION);
    }
    function getEffectiveTransition(nextState, oldState) {
      const nextTransition = normalizeTransition(nextState.境界变动);
      if (nextTransition.类型 !== "无") return nextTransition;
      const oldTransition = normalizeTransition(oldState.境界变动);
      return oldState.阶段 === "突破中" && oldTransition.类型 !== "无" ? oldTransition : nextTransition;
    }
    function setRealmTransitionSettled(cultivator, level, result) {
      cultivator.等级 = level;
      cultivator.尝试突破 = false;
      const state = cultivator.修炼状态 ??= {};
      state.阶段 = "稳固中";
      state.瓶颈原因 = "";
      state.突破目标 = "";
      state.上次结果 = result;
      state.境界变动 = _.cloneDeep(EMPTY_REALM_TRANSITION);
    }
    function applyCultivatorRealmTransition(nextCultivator, oldCultivator, label, warnings) {
      const oldLevel = (0, _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeRealmLevel)(oldCultivator.等级);
      const requestedLevel = (0, _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeRealmLevel)(nextCultivator.等级);
      const nextState = nextCultivator.修炼状态 ??= {};
      const oldState = oldCultivator.修炼状态 ?? {};
      const transition = getEffectiveTransition(nextState, oldState);
      let finalLevel = requestedLevel;
      if (requestedLevel > oldLevel) {
        if (requestedLevel > oldLevel + 1) {
          const hasValidCrossLevelEvidence = transition.类型 === "跨级突破" && transition.目标等级 === requestedLevel && transition.依据.trim().length >= 4;
          if (!hasValidCrossLevelEvidence) {
            finalLevel = Math.min(oldLevel + 1, 48);
            warnings.push(`${label}缺少有效跨级依据，等级 ${requestedLevel} 已收敛为 ${finalLevel}`);
          }
        }
        nextCultivator.修为 = 0;
        setRealmTransitionSettled(nextCultivator, finalLevel, "成功");
        return finalLevel !== oldLevel;
      }
      if (requestedLevel < oldLevel) {
        const hasValidRealmLossEvidence = transition.类型 === "跌境" && transition.目标等级 === requestedLevel && transition.依据.trim().length >= 4;
        if (!hasValidRealmLossEvidence) {
          nextCultivator.等级 = oldLevel;
          nextState.境界变动 = _.cloneDeep(EMPTY_REALM_TRANSITION);
          warnings.push(`${label}缺少有效跌境依据，等级 ${requestedLevel} 已恢复为 ${oldLevel}`);
          return false;
        }
        const threshold = (0, _schema__WEBPACK_IMPORTED_MODULE_0__.getRealmThreshold)(requestedLevel);
        const cultivation = Number(nextCultivator.修为);
        nextCultivator.修为 = Number.isFinite(cultivation) ? _.clamp(cultivation, 0, Math.max(0, threshold - 1)) : 0;
        setRealmTransitionSettled(nextCultivator, requestedLevel, "失败");
        return true;
      }
      const targetLevel = (0, _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeRealmLevel)(transition.目标等级);
      const reportsSuccessfulSettlement = nextState.阶段 === "稳固中" && nextState.上次结果 === "成功" && transition.类型 !== "无";
      if (reportsSuccessfulSettlement && targetLevel > oldLevel) {
        const isNormalBreakthrough = transition.类型 === "突破" && targetLevel === oldLevel + 1;
        const isValidCrossLevel = transition.类型 === "跨级突破" && targetLevel > oldLevel + 1 && transition.依据.trim().length >= 4;
        finalLevel = isNormalBreakthrough || isValidCrossLevel ? targetLevel : Math.min(oldLevel + 1, 48);
        if (!isNormalBreakthrough && !isValidCrossLevel) {
          warnings.push(`${label}的成功结算缺少有效跨级依据，目标已收敛为 ${finalLevel}`);
        }
        nextCultivator.修为 = 0;
        setRealmTransitionSettled(nextCultivator, finalLevel, "成功");
        return finalLevel !== oldLevel;
      }
      if (nextState.阶段 !== "突破中" && transition.类型 !== "无") {
        nextCultivator.尝试突破 = false;
        nextState.境界变动 = _.cloneDeep(EMPTY_REALM_TRANSITION);
      }
      return false;
    }
    function applyRealmTransitionGuards(nextStatData, oldStatData) {
      const data = _.cloneDeep(nextStatData);
      const warnings = [];
      const protagonistLevelChanged = applyCultivatorRealmTransition(data.本尊 ?? (data.本尊 = {}), oldStatData.本尊 ?? {}, "本尊", warnings);
      for (const [name, companion] of Object.entries(data.红颜 ?? {})) {
        const oldCompanion = _.get(oldStatData, [ "红颜", name ]);
        if (!oldCompanion) continue;
        applyCultivatorRealmTransition(companion, oldCompanion, `红颜·${name}`, warnings);
      }
      return {
        data,
        warnings,
        protagonistLevelChanged
      };
    }
    function correctProtagonistRealmText(text, level, companionNames = []) {
      const source = String(text ?? "");
      if (!source) return source;
      const correctRealm = (0, _schema__WEBPACK_IMPORTED_MODULE_0__.describeRealmByLevel)(level);
      return source.replace(/((?:已|成功)?(?:突破|晋升|破境)(?:至|到|为)\s*)((?:练气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫|真仙|仙王|仙帝)(?:初期|中期|后期|大圆满))/gu, (fullMatch, actionPrefix, realm, offset) => {
        if (realm === correctRealm || !REALM_TEXT_PATTERN.test(realm)) {
          REALM_TEXT_PATTERN.lastIndex = 0;
          return fullMatch;
        }
        REALM_TEXT_PATTERN.lastIndex = 0;
        const subjectPrefix = source.slice(Math.max(0, offset - 12), offset).trimEnd();
        const explicitlyOther = /(?:她|他)$/u.test(subjectPrefix) || companionNames.some(name => subjectPrefix.endsWith(name));
        const explicitlyProtagonist = /(?:你|本尊|\{\{user\}\})$/u.test(subjectPrefix);
        if (explicitlyOther && !explicitlyProtagonist) return fullMatch;
        return `${actionPrefix}${correctRealm}`;
      });
    }
    function uniqueIssuePaths(issues) {
      const seen = new Set;
      const paths = [];
      for (const issue of issues) {
        const key = JSON.stringify(issue.path);
        if (seen.has(key)) continue;
        seen.add(key);
        paths.push(issue.path);
      }
      return paths;
    }
    function repairStatDataWithFallback(nextStatData, oldStatData) {
      const candidate = _.cloneDeep(nextStatData);
      const oldData = oldStatData && typeof oldStatData === "object" ? _.cloneDeep(oldStatData) : {};
      const warnings = [];
      let repaired = false;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const parsed = _schema__WEBPACK_IMPORTED_MODULE_0__.Schema.safeParse(candidate);
        if (parsed.success) {
          return {
            data: _.cloneDeep(parsed.data),
            warnings,
            repaired
          };
        }
        const issuePaths = uniqueIssuePaths(parsed.error.issues);
        let changed = false;
        for (const path of issuePaths) {
          if (path.length === 0) continue;
          if (_.has(oldData, path)) {
            _.set(candidate, path, _.cloneDeep(_.get(oldData, path)));
            warnings.push(`非法字段 ${path.map(String).join(".")} 已恢复旧值`);
            changed = true;
            repaired = true;
          } else if (_.has(candidate, path)) {
            _.unset(candidate, path);
            warnings.push(`非法新增字段 ${path.map(String).join(".")} 已移除`);
            changed = true;
            repaired = true;
          }
        }
        if (!changed) break;
      }
      const parsedOldData = _schema__WEBPACK_IMPORTED_MODULE_0__.Schema.safeParse(oldData);
      if (parsedOldData.success) {
        warnings.push("局部修复后仍无法解析，已恢复整份旧的有效变量");
        return {
          data: _.cloneDeep(parsedOldData.data),
          warnings,
          repaired: true
        };
      }
      warnings.push("新旧变量均无法通过 Schema 校验，本轮未执行自动覆盖");
      return {
        data: null,
        warnings,
        repaired
      };
    }
    function guardParsedCommands(variables, commands) {
      const mutableCommands = commands;
      const appendedCommands = [];
      for (const command of mutableCommands) {
        if (!Array.isArray(command.args) || command.args.length === 0) continue;
        const rawPath = String(command.args[0] ?? "");
        const path = normalizeCompanionAliasPath(normalizeCommandPath(rawPath));
        if (path && path !== rawPath) command.args[0] = path;
        if (path && rewriteReadonlyDerivedCommand(command, path, variables)) continue;
        appendedCommands.push(...rewriteDuplicateCompanionInsert(command, path, variables));
        const valueArgIndex = getCommandValueArgIndex(command);
        if (valueArgIndex === null || !path) continue;
        const rawValue = command.args[valueArgIndex];
        const normalizedValue = coerceByPath(path, rawValue);
        command.args[valueArgIndex] = normalizedValue;
        if (!_.isEqual(normalizedValue, rawValue) && !command.reason) {
          command.reason = path === "stat_data.可参与机遇" ? "嵌套的行动列表 patch 已由权威变量守卫自动拆包" : "变量值已由权威变量守卫归一化";
        }
        rememberExplicitLevel(command, path, normalizedValue, variables);
      }
      mutableCommands.push(...appendedCommands);
    }
    function handleVariableUpdateEnded(newVariables, oldVariables) {
      try {
        applyPendingExplicitLevels(newVariables);
        const nextStatData = _.get(newVariables, "stat_data");
        const rawOldStatData = _.get(oldVariables, "stat_data", {});
        if (!nextStatData || typeof nextStatData !== "object") return;
        const parsedOldStatData = _schema__WEBPACK_IMPORTED_MODULE_0__.Schema.safeParse(rawOldStatData);
        const oldStatData = parsedOldStatData.success ? parsedOldStatData.data : lastValidStatData ?? rawOldStatData;
        const transitionResult = applyRealmTransitionGuards(nextStatData, oldStatData);
        if (transitionResult.protagonistLevelChanged) {
          transitionResult.data.当前处境 = correctProtagonistRealmText(transitionResult.data.当前处境, transitionResult.data.本尊?.等级, Object.keys(transitionResult.data.红颜 ?? {}));
        }
        const repairResult = repairStatDataWithFallback(transitionResult.data, oldStatData);
        const warnings = [ ...transitionResult.warnings, ...repairResult.warnings ];
        if (repairResult.data) {
          _.set(newVariables, "stat_data", repairResult.data);
          lastValidStatData = _.cloneDeep(repairResult.data);
        }
        if (warnings.length > 0) {
          console.warn("[灯火阑珊] 变量守卫完成确定性修复", warnings);
        }
      } catch (error) {
        console.warn("[灯火阑珊] 变量守卫结算失败，保留 MVU 原始结果", error);
      } finally {
        pendingExplicitLevels.clear();
      }
    }
    function installAuthoritativeMvuGuard() {
      const globalRef = window;
      if (globalRef[GUARD_INSTALLED_KEY]) return () => undefined;
      globalRef[GUARD_INSTALLED_KEY] = true;
      try {
        const currentStatData = _.get(getVariables({
          type: "chat"
        }), "stat_data");
        const parsedCurrentStatData = _schema__WEBPACK_IMPORTED_MODULE_0__.Schema.safeParse(currentStatData);
        lastValidStatData = parsedCurrentStatData.success ? _.cloneDeep(parsedCurrentStatData.data) : null;
      } catch {
        lastValidStatData = null;
      }
      const eventStops = [ eventOn(Mvu.events.COMMAND_PARSED, guardParsedCommands).stop, eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, handleVariableUpdateEnded).stop ];
      console.info("[灯火阑珊] 权威 MVU 变量守卫已启用");
      return () => {
        eventStops.forEach(stop => {
          try {
            stop();
          } catch {}
        });
        pendingExplicitLevels.clear();
        lastValidStatData = null;
        delete globalRef[GUARD_INSTALLED_KEY];
      };
    }
  },
  "./src/灯火阑珊/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CONFIG: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.CONFIG,
      CharacterLibEntrySchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CharacterLibEntrySchema,
      CompanionSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CompanionSchema,
      CultivationStateSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.CultivationStateSchema,
      CustomPortraitSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CustomPortraitSchema,
      DEFAULT_CHARACTER_LIB: () => _schema_characters__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_CHARACTER_LIB,
      DEFAULT_FACTIONS: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_FACTIONS,
      DEFAULT_LOCATIONS: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_LOCATIONS,
      DEFAULT_TREASURES: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_TREASURES,
      DifficultySystemSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.DifficultySystemSchema,
      FactionSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.FactionSchema,
      InventorySchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.InventorySchema,
      ItemSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.ItemSchema,
      LocationSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.LocationSchema,
      NormalizedStringListSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.NormalizedStringListSchema,
      NpcSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_1__.NpcSchema,
      OpportunitySchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.OpportunitySchema,
      PhysiqueSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.PhysiqueSchema,
      ProtagonistSchema: () => _schema_protagonist__WEBPACK_IMPORTED_MODULE_3__.ProtagonistSchema,
      QuestSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.QuestSchema,
      REALM_LIFESPANS: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_LIFESPANS,
      REALM_NAMES: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_NAMES,
      REALM_STAGES: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_STAGES,
      REALM_THRESHOLDS: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_THRESHOLDS,
      RealmTransitionSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.RealmTransitionSchema,
      ReputationEntrySchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.ReputationEntrySchema,
      ReputationSystemSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.ReputationSystemSchema,
      Schema: () => Schema,
      SkillListSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.SkillListSchema,
      SkillSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.SkillSchema,
      SpiritRootSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.SpiritRootSchema,
      SystemSettingsSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.SystemSettingsSchema,
      TechniqueSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.TechniqueSchema,
      TreasureSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.TreasureSchema,
      calculateBaseCombatPower: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.calculateBaseCombatPower,
      computeRealmInfo: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.computeRealmInfo,
      describeRealmByLevel: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.describeRealmByLevel,
      evaluateCombatPower: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.evaluateCombatPower,
      extractSpiritStoneFromInventory: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.extractSpiritStoneFromInventory,
      finiteNumber: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber,
      getCultivationStatusLabel: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.getCultivationStatusLabel,
      getDangerColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.getDangerColor,
      getRealmColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.getRealmColor,
      getRealmThreshold: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.getRealmThreshold,
      getRootColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.getRootColor,
      isSpiritStoneCurrencyItem: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.migrateLegacyCultivationProgress,
      normalizeCultivationState: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeCultivationState,
      normalizeRealmLevel: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeRealmLevel,
      normalizeSpiritStoneState: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeSpiritStoneState,
      parseRealmToLevel: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.parseRealmToLevel,
      unwrapOpportunityPatchPayload: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.unwrapOpportunityPatchPayload,
      品阶映射: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__["品阶映射"],
      熟练度映射: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__["熟练度映射"]
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _schema_characters__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./schema/characters */ "./src/灯火阑珊/schema/characters.ts");
    var _schema_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./schema/common */ "./src/灯火阑珊/schema/common.ts");
    var _schema_protagonist__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./schema/protagonist */ "./src/灯火阑珊/schema/protagonist.ts");
    var _schema_systems__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./schema/systems */ "./src/灯火阑珊/schema/systems.ts");
    var _schema_world__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./schema/world */ "./src/灯火阑珊/schema/world.ts");
    var _schema_constants__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./schema/constants */ "./src/灯火阑珊/schema/constants.ts");
    var _schema_utils__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./schema/utils */ "./src/灯火阑珊/schema/utils.ts");
    const DUAL_SOUL_CANONICAL_NAME = "虞汐颜";
    const DUAL_SOUL_ALIASES = [ "虞汐", "虞颜" ];
    const SHUO_LIYUAN_CANONICAL_NAME = "朔璃鸢";
    const SHUO_LIYUAN_ALIASES = [ "阿鸢", "血手飞鸢" ];
    const SHUO_WANGSHU_CANONICAL_NAME = "朔望舒";
    const SHUO_WANGSHU_ALIASES = [ "赤月女帝", "幽影宗主" ];
    const AN_CHICHI_CANONICAL_NAME = "安迟迟";
    const AN_CHICHI_ALIASES = [ "念迟迟", "蘅之", "拈韵居士", "掌籍师姐" ];
    const COMPANION_ALIAS_GROUPS = [ {
      canonical: DUAL_SOUL_CANONICAL_NAME,
      aliases: DUAL_SOUL_ALIASES
    }, {
      canonical: SHUO_LIYUAN_CANONICAL_NAME,
      aliases: SHUO_LIYUAN_ALIASES
    }, {
      canonical: SHUO_WANGSHU_CANONICAL_NAME,
      aliases: SHUO_WANGSHU_ALIASES
    }, {
      canonical: AN_CHICHI_CANONICAL_NAME,
      aliases: AN_CHICHI_ALIASES
    } ];
    const LATEST_CULTIVATION_SYSTEM_VERSION = 3;
    const LATEST_SCHEMA_VERSION = 2;
    const DEFAULT_COMPANION = _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CompanionSchema.parse({});
    const CJK_TEXT_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
    const MAX_OPPORTUNITIES = 4;
    const ACTION_TEXT_LIMIT = 48;
    const ACTION_HINT_LIMIT = 28;
    const SITUATION_TEXT_LIMIT = 64;
    function normalizePromptText(value, maxLength) {
      return Array.from(String(value ?? "").replace(/\s+/gu, " ").trim()).slice(0, maxLength).join("");
    }
    function preferNonDefaultString(incoming, current, fallback) {
      const normalizedIncoming = String(incoming ?? "").trim();
      if (normalizedIncoming && normalizedIncoming !== fallback) {
        return normalizedIncoming;
      }
      return current;
    }
    function extractChineseQuestLabel(input) {
      const raw = String(input ?? "").trim();
      if (!raw) {
        return "";
      }
      const strippedPrefix = raw.replace(/^(?:[A-Za-z][A-Za-z0-9]*)(?:[._:\-/\\\s]+[A-Za-z0-9]+)*[._:\-/\\\s]*/u, "").trim();
      const candidate = strippedPrefix || raw;
      const firstCjkIndex = candidate.search(CJK_TEXT_PATTERN);
      if (firstCjkIndex < 0) {
        return "";
      }
      return candidate.slice(firstCjkIndex).trim();
    }
    function getQuestFallbackLabel(type) {
      const normalizedType = String(type ?? "").trim();
      const fallbackByType = {
        主线: "主线任务",
        支线: "支线任务",
        每日: "每日任务",
        临危受命: "临危受命",
        秘境探索: "秘境探索"
      };
      return fallbackByType[normalizedType] || "未命名任务";
    }
    function mergeCompanionData(base, incoming) {
      if (!base) {
        return _.cloneDeep(incoming);
      }
      const merged = _.cloneDeep(base);
      const fallbackRelationContext = _.cloneDeep(DEFAULT_COMPANION.关系上下文);
      merged.等级 = Math.max(Number(base.等级 ?? DEFAULT_COMPANION.等级), Number(incoming.等级 ?? DEFAULT_COMPANION.等级));
      merged.修为 = Math.max(Number(base.修为 ?? DEFAULT_COMPANION.修为), Number(incoming.修为 ?? DEFAULT_COMPANION.修为));
      merged.灵石 = Math.max(Number(base.灵石 ?? DEFAULT_COMPANION.灵石), Number(incoming.灵石 ?? DEFAULT_COMPANION.灵石));
      merged.已活岁月 = Math.max(Number(base.已活岁月 ?? DEFAULT_COMPANION.已活岁月), Number(incoming.已活岁月 ?? DEFAULT_COMPANION.已活岁月));
      merged.尝试突破 = Boolean(base.尝试突破 || incoming.尝试突破);
      const fallbackCultivationState = _.cloneDeep(DEFAULT_COMPANION.修炼状态);
      merged.修炼状态 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeCultivationState)({
        阶段: preferNonDefaultString(incoming.修炼状态?.阶段, String(base.修炼状态?.阶段 ?? fallbackCultivationState.阶段), fallbackCultivationState.阶段),
        瓶颈原因: preferNonDefaultString(incoming.修炼状态?.瓶颈原因, String(base.修炼状态?.瓶颈原因 ?? fallbackCultivationState.瓶颈原因), fallbackCultivationState.瓶颈原因),
        突破目标: preferNonDefaultString(incoming.修炼状态?.突破目标, String(base.修炼状态?.突破目标 ?? fallbackCultivationState.突破目标), fallbackCultivationState.突破目标),
        上次结果: preferNonDefaultString(incoming.修炼状态?.上次结果, String(base.修炼状态?.上次结果 ?? fallbackCultivationState.上次结果), fallbackCultivationState.上次结果),
        境界变动: incoming.修炼状态?.境界变动?.类型 !== "无" ? incoming.修炼状态.境界变动 : base.修炼状态?.境界变动
      }, {
        legacyAttemptBreakthrough: merged.尝试突破,
        level: merged.等级,
        cultivation: merged.修为
      });
      merged.好感度 = Number.isFinite(Number(incoming.好感度)) ? Number(incoming.好感度) : Number(base.好感度 ?? DEFAULT_COMPANION.好感度);
      merged.关系 = preferNonDefaultString(incoming.关系, String(base.关系 ?? DEFAULT_COMPANION.关系), DEFAULT_COMPANION.关系);
      merged.关系上下文 = {
        当前情绪: preferNonDefaultString(incoming.关系上下文?.当前情绪, String(base.关系上下文?.当前情绪 ?? fallbackRelationContext.当前情绪), fallbackRelationContext.当前情绪),
        态度缘由: preferNonDefaultString(incoming.关系上下文?.态度缘由, String(base.关系上下文?.态度缘由 ?? fallbackRelationContext.态度缘由), fallbackRelationContext.态度缘由),
        关系诉求: preferNonDefaultString(incoming.关系上下文?.关系诉求, String(base.关系上下文?.关系诉求 ?? fallbackRelationContext.关系诉求), fallbackRelationContext.关系诉求),
        相处禁忌: preferNonDefaultString(incoming.关系上下文?.相处禁忌, String(base.关系上下文?.相处禁忌 ?? fallbackRelationContext.相处禁忌), fallbackRelationContext.相处禁忌),
        未了约定: preferNonDefaultString(incoming.关系上下文?.未了约定, String(base.关系上下文?.未了约定 ?? fallbackRelationContext.未了约定), fallbackRelationContext.未了约定)
      };
      if (String(base.灵根 ?? DEFAULT_COMPANION.灵根) === DEFAULT_COMPANION.灵根 && String(incoming.灵根 ?? "").trim()) {
        merged.灵根 = incoming.灵根;
      }
      if (String(base.体质 ?? DEFAULT_COMPANION.体质) === DEFAULT_COMPANION.体质 && String(incoming.体质 ?? "").trim()) {
        merged.体质 = incoming.体质;
      }
      if (String(base.功法 ?? DEFAULT_COMPANION.功法) === DEFAULT_COMPANION.功法 && String(incoming.功法 ?? "").trim()) {
        merged.功法 = incoming.功法;
      }
      if (String(base.本命兵器 ?? DEFAULT_COMPANION.本命兵器) === DEFAULT_COMPANION.本命兵器 && String(incoming.本命兵器 ?? "").trim()) {
        merged.本命兵器 = incoming.本命兵器;
      }
      merged.神通列表 = {
        ...base.神通列表 ?? {},
        ...incoming.神通列表 ?? {}
      };
      return merged;
    }
    function mergeCharacterLibEntry(base, incoming) {
      if (!base) {
        return _.cloneDeep(incoming);
      }
      return {
        级: Math.max(Number(base.级 ?? 1), Number(incoming.级 ?? 1)),
        根: preferNonDefaultString(incoming.根, String(base.根 ?? ""), ""),
        质: preferNonDefaultString(incoming.质, String(base.质 ?? ""), ""),
        龄: preferNonDefaultString(incoming.龄, String(base.龄 ?? ""), ""),
        属: preferNonDefaultString(incoming.属, String(base.属 ?? ""), ""),
        法: preferNonDefaultString(incoming.法, String(base.法 ?? ""), ""),
        器: preferNonDefaultString(incoming.器, String(base.器 ?? ""), ""),
        通: Array.from(new Set([ ...base.通 ?? [], ...incoming.通 ?? [] ].map(value => String(value).trim()).filter(Boolean))),
        自定义立绘: {
          正面: String(incoming.自定义立绘?.正面 ?? "").trim() || String(base.自定义立绘?.正面 ?? "").trim(),
          背面: String(incoming.自定义立绘?.背面 ?? "").trim() || String(base.自定义立绘?.背面 ?? "").trim()
        }
      };
    }
    function normalizeCharacterLibraryAliases(library) {
      const normalizedLibrary = _.cloneDeep(library ?? {});
      for (const {canonical, aliases} of COMPANION_ALIAS_GROUPS) {
        let canonicalEntry = normalizedLibrary[canonical] ? _.cloneDeep(normalizedLibrary[canonical]) : undefined;
        for (const alias of aliases) {
          const aliasEntry = normalizedLibrary[alias];
          if (!aliasEntry) continue;
          canonicalEntry = mergeCharacterLibEntry(canonicalEntry, aliasEntry);
          delete normalizedLibrary[alias];
        }
        if (canonicalEntry) {
          normalizedLibrary[canonical] = canonicalEntry;
        }
      }
      return normalizedLibrary;
    }
    function normalizeCompanionAliases(companions, snapshot) {
      const normalizedCompanions = _.cloneDeep(companions ?? {});
      const normalizedSnapshot = _.cloneDeep(snapshot ?? {});
      for (const {canonical, aliases} of COMPANION_ALIAS_GROUPS) {
        let canonicalCompanion = normalizedCompanions[canonical] ? _.cloneDeep(normalizedCompanions[canonical]) : undefined;
        for (const alias of aliases) {
          const aliasCompanion = normalizedCompanions[alias];
          if (!aliasCompanion) continue;
          canonicalCompanion = mergeCompanionData(canonicalCompanion, aliasCompanion);
          delete normalizedCompanions[alias];
        }
        if (canonicalCompanion) {
          normalizedCompanions[canonical] = canonicalCompanion;
        }
        const snapshotCandidates = [ normalizedSnapshot[canonical], ...aliases.map(alias => normalizedSnapshot[alias]) ].map(value => Number(value)).filter(value => Number.isFinite(value));
        for (const alias of aliases) {
          delete normalizedSnapshot[alias];
        }
        if (snapshotCandidates.length > 0) {
          normalizedSnapshot[canonical] = snapshotCandidates[snapshotCandidates.length - 1];
        }
      }
      return {
        companions: normalizedCompanions,
        snapshot: normalizedSnapshot
      };
    }
    function getFavorDeltaLimitByValue(favor) {
      const normalizedFavor = Math.max(0, Number.isFinite(favor) ? favor : 0);
      if (normalizedFavor <= 20) return 6;
      if (normalizedFavor <= 60) return 4;
      if (normalizedFavor <= 120) return 3;
      return 2;
    }
    function normalizeProtagonistCultivation(protagonist, currentCultivationVersion) {
      if (currentCultivationVersion < LATEST_CULTIVATION_SYSTEM_VERSION) {
        protagonist.修为 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.migrateCultivationProgress)(protagonist.等级, protagonist.修为, currentCultivationVersion, LATEST_CULTIVATION_SYSTEM_VERSION);
      }
      protagonist.修炼状态 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeCultivationState)(protagonist.修炼状态, {
        legacyAttemptBreakthrough: protagonist.尝试突破,
        level: protagonist.等级,
        cultivation: protagonist.修为
      });
      protagonist.尝试突破 = protagonist.修炼状态.阶段 === "突破中";
      Object.assign(protagonist, (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.computeRealmInfo)(protagonist, true));
    }
    function normalizeCompanionCultivation(companion, currentCultivationVersion) {
      if (currentCultivationVersion < LATEST_CULTIVATION_SYSTEM_VERSION) {
        companion.修为 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.migrateCultivationProgress)(companion.等级, companion.修为, currentCultivationVersion, LATEST_CULTIVATION_SYSTEM_VERSION);
      }
      companion.修炼状态 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeCultivationState)(companion.修炼状态, {
        legacyAttemptBreakthrough: companion.尝试突破,
        level: companion.等级,
        cultivation: companion.修为
      });
      companion.尝试突破 = companion.修炼状态.阶段 === "突破中";
      Object.assign(companion, (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.computeRealmInfo)(companion, false));
    }
    const Schema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      世界时钟: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        纪元: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("盛法时代"),
        年份: (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).transform(v => Math.max(1, Math.floor(v))).prefault(1),
        月份: (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).transform(v => _.clamp(Math.floor(v), 1, 12)).prefault(1),
        日期: (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).transform(v => _.clamp(Math.floor(v), 1, 30)).prefault(1),
        时辰: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("子时")
      }).prefault({
        纪元: "盛法时代",
        年份: 1,
        月份: 1,
        日期: 1,
        时辰: "子时"
      }),
      世界地图: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("区域名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        layer: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "天层", "地层", "下层" ]).prefault("地层"),
        danger: (0, _schema_common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).transform(v => _.clamp(v, 0, 100)),
        desc: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
        connections: _schema_common__WEBPACK_IMPORTED_MODULE_2__.NormalizedStringListSchema
      })).prefault({}),
      世界图志: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("事件名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
        事件: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
      })).prefault({}),
      宗门势力库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("宗门名"), _schema_world__WEBPACK_IMPORTED_MODULE_5__.FactionSchema).prefault({}),
      功法库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("功法名"), _schema_world__WEBPACK_IMPORTED_MODULE_5__.TechniqueSchema).prefault({}),
      法宝库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("法宝名"), _schema_world__WEBPACK_IMPORTED_MODULE_5__.TreasureSchema).prefault(_schema_world__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_TREASURES),
      地点库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("地点名"), _schema_world__WEBPACK_IMPORTED_MODULE_5__.LocationSchema).prefault(_schema_world__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_LOCATIONS),
      $宗门推断: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        当前域: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
        当前主势力: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
      }).prefault({
        当前域: "",
        当前主势力: ""
      }),
      灵根库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("灵根名"), _schema_world__WEBPACK_IMPORTED_MODULE_5__.SpiritRootSchema).prefault({}),
      体质库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("体质名"), _schema_world__WEBPACK_IMPORTED_MODULE_5__.PhysiqueSchema).prefault({}),
      本尊: _schema_protagonist__WEBPACK_IMPORTED_MODULE_3__.ProtagonistSchema,
      红颜角色库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("角色名"), _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CharacterLibEntrySchema).prefault(_schema_characters__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_CHARACTER_LIB),
      红颜: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("红颜名"), _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CompanionSchema).prefault({}),
      NPC图鉴: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("NPC名"), _schema_characters__WEBPACK_IMPORTED_MODULE_1__.NpcSchema).prefault({}),
      任务列表: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("任务ID"), _schema_systems__WEBPACK_IMPORTED_MODULE_4__.QuestSchema).prefault({}).transform(v => _(v).pickBy((task, taskId) => !!task && !!String(taskId).trim()).mapValues((task, taskId) => ({
        ...task,
        名称: extractChineseQuestLabel(task.名称) || extractChineseQuestLabel(taskId) || getQuestFallbackLabel(task.类型)
      })).pickBy(task => task.状态 === "进行中").value()),
      声望系统: _schema_systems__WEBPACK_IMPORTED_MODULE_4__.ReputationSystemSchema,
      难度系统: _schema_systems__WEBPACK_IMPORTED_MODULE_4__.DifficultySystemSchema,
      可参与机遇: zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(_schema_systems__WEBPACK_IMPORTED_MODULE_4__.unwrapOpportunityPatchPayload, zod__WEBPACK_IMPORTED_MODULE_0__.z.array(_schema_systems__WEBPACK_IMPORTED_MODULE_4__.OpportunitySchema).prefault([]).transform(list => {
        const seen = new Set;
        return list.flatMap(item => {
          const action = normalizePromptText(item.行动, ACTION_TEXT_LIMIT);
          if (!action || seen.has(action)) {
            return [];
          }
          seen.add(action);
          const hint = normalizePromptText(item.提示, ACTION_HINT_LIMIT);
          return [ {
            行动: action,
            类型: item.类型,
            ...hint ? {
              提示: hint
            } : {}
          } ];
        }).slice(0, MAX_OPPORTUNITIES);
      })),
      当前处境: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("").transform(value => normalizePromptText(value, SITUATION_TEXT_LIMIT)),
      _系统设置: _schema_systems__WEBPACK_IMPORTED_MODULE_4__.SystemSettingsSchema,
      _好感度快照: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("红颜名"), (0, 
      _schema_common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).transform(v => _.clamp(v, -200, 200))).prefault({})
    }).transform(data => {
      data.红颜角色库 = normalizeCharacterLibraryAliases(data.红颜角色库 ?? {});
      const normalizedCompanionData = normalizeCompanionAliases(data.红颜 ?? {}, data._好感度快照 ?? {});
      data.红颜 = normalizedCompanionData.companions;
      data._好感度快照 = normalizedCompanionData.snapshot;
      const currentCultivationVersion = Math.max(1, Math.floor(Number(data._系统设置?.修炼系统版本 ?? 1) || 1));
      normalizeProtagonistCultivation(data.本尊, currentCultivationVersion);
      for (const companion of Object.values(data.红颜 ?? {})) {
        normalizeCompanionCultivation(companion, currentCultivationVersion);
      }
      data._系统设置 = {
        ...data._系统设置 ?? {},
        修炼系统版本: LATEST_CULTIVATION_SYSTEM_VERSION,
        变量结构版本: LATEST_SCHEMA_VERSION,
        _临时状态手动覆盖签名: String(data._系统设置?._临时状态手动覆盖签名 ?? "")
      };
      const snapshot = _.cloneDeep(data._好感度快照 ?? {});
      for (const [name, companion] of Object.entries(data.红颜 ?? {})) {
        const currentFavor = Number(companion?.好感度);
        if (!Number.isFinite(currentFavor)) {
          continue;
        }
        const prevFavor = Number(snapshot[name]);
        if (Number.isFinite(prevFavor)) {
          const favorDeltaLimit = getFavorDeltaLimitByValue(prevFavor);
          companion.好感度 = _.clamp(currentFavor, prevFavor - favorDeltaLimit, prevFavor + favorDeltaLimit);
        } else {
          companion.好感度 = _.clamp(currentFavor, -200, 200);
        }
        snapshot[name] = companion.好感度;
      }
      data._好感度快照 = _.pickBy(snapshot, (_value, name) => _.has(data.红颜, name));
      return data;
    });
  },
  "./src/灯火阑珊/schema/characters.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CharacterLibEntrySchema: () => CharacterLibEntrySchema,
      CompanionRelationContextSchema: () => CompanionRelationContextSchema,
      CompanionSchema: () => CompanionSchema,
      CustomPortraitSchema: () => CustomPortraitSchema,
      DEFAULT_CHARACTER_LIB: () => DEFAULT_CHARACTER_LIB,
      NpcSchema: () => NpcSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const CustomPortraitSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正面: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      背面: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const CharacterLibEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      龄: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      属: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("无"),
      器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("无"),
      通: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([]).transform(values => _.uniq(values.map(value => value.trim()).filter(Boolean))),
      自定义立绘: CustomPortraitSchema
    }).prefault({});
    const DEFAULT_CHARACTER_LIB = {
      许听雨: {
        级: 33,
        根: "水本源天",
        质: "归墟神体",
        龄: "外26实12000",
        属: "归墟之主",
        法: "万水归源先天",
        器: "沧海遗珠先天",
        通: [ "归墟歌", "逆流虚妄", "寂灭海域", "万水同源" ]
      },
      虞汐颜: {
        级: 12,
        根: "水阴阳异",
        质: "双鱼体",
        龄: "化形0年",
        属: "{{user}}玉佩",
        法: "双生天极/阴阳",
        器: "双鱼佩本体",
        通: [ "枯木春", "夺命妆", "双鱼梦" ]
      },
      白清弦: {
        级: 29,
        根: "金天根",
        质: "剑体",
        龄: "外30实1000+",
        属: "散修剑宗师",
        法: "剑意仙/天音天",
        器: "清弦琴剑灵宝",
        通: [ "琴剑杀", "剑意歌", "万剑心" ]
      },
      南宫云裳: {
        级: 16,
        根: "火天根",
        质: "神凰道体",
        龄: "外10实118",
        属: "大夏栖凤宫主",
        法: "九转涅槃仙",
        器: "栖梧簪灵宝",
        通: [ "南明离火", "凰威镇世", "羽化虚空" ]
      },
      梦杳泠: {
        级: 23,
        根: "瑞兽异根",
        质: "乘黄圣体",
        龄: "外8实万年+",
        属: "无(末代乘黄)",
        法: "乘黄本源天",
        器: "无",
        通: [ "瑞光庇佑", "灵觉通明", "本源爆发" ]
      },
      阮忘忧: {
        级: 44,
        根: "因果大道本源",
        质: "万法不侵之体",
        龄: "二八芳华/历劫万载",
        属: "仙界仙王（凡界伪装）",
        法: "因果大道",
        器: "无（万物皆兵）",
        通: [ "概念抹除", "因果篡改", "仙王威压", "重塑纪元" ]
      },
      晚棠: {
        级: 15,
        根: "幽冥灵根",
        质: "噬魂之体",
        龄: "未知",
        属: "散修",
        法: "幽冥归魂经天",
        器: "引魂铃灵宝",
        通: [ "冥河指引", "冥莲沉梦", "归魂摆舟" ]
      },
      朔璃鸢: {
        级: 4,
        根: "异变风灵根",
        质: "桂魄玲珑体",
        龄: "外16实16",
        属: "西庚琼轮垂曜宫离宗千金",
        法: "碎星幽影诀残篇",
        器: "碎星双刃",
        通: [ "燕回闪" ]
      },
      朔望舒: {
        级: 32,
        根: "皓月异灵根",
        质: "皓月幽微体",
        龄: "外20实2000+",
        属: "西庚琼轮垂曜宫宫主",
        法: "赤渊镇世血月诀",
        器: "霜魄极品灵宝",
        通: [ "月映千机", "赤月昭心", "月华封禁", "血月镇魂", "万影归宗" ]
      },
      安迟迟: {
        级: 9,
        根: "木属天灵根",
        质: "墨海灵心",
        龄: "外23实23",
        属: "东苍浮云朝露阁藏卷阁掌籍弟子",
        法: "书画载道",
        器: "青琅玕笔",
        通: [ "神魂镇海", "书墨化形", "丹青赋灵", "过目成诵" ]
      }
    };
    const CompanionRelationContextSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      当前情绪: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      态度缘由: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      关系诉求: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      相处禁忌: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      未了约定: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const CompanionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      修为: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      灵根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("五行杂灵根"),
      体质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡体"),
      功法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      本命兵器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      神通列表: _common__WEBPACK_IMPORTED_MODULE_1__.SkillListSchema,
      灵石: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      已活岁月: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      尝试突破: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      修炼状态: _common__WEBPACK_IMPORTED_MODULE_1__.CultivationStateSchema,
      好感度: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, -200, 200)).prefault(0),
      关系: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("陌生人"),
      关系上下文: CompanionRelationContextSchema
    }).prefault({
      等级: 1,
      修为: 0,
      灵根: "五行杂灵根",
      体质: "凡体",
      功法: "无",
      本命兵器: "无",
      神通列表: {},
      灵石: 0,
      已活岁月: 0,
      尝试突破: false,
      修炼状态: {
        阶段: "修炼中",
        瓶颈原因: "",
        突破目标: "",
        上次结果: "无",
        境界变动: {
          类型: "无",
          目标等级: 0,
          依据: ""
        }
      },
      好感度: 0,
      关系: "陌生人",
      关系上下文: {}
    }).transform(data => {
      data.修炼状态 = (0, _common__WEBPACK_IMPORTED_MODULE_1__.normalizeCultivationState)(data.修炼状态, {
        legacyAttemptBreakthrough: data.尝试突破,
        level: data.等级,
        cultivation: data.修为
      });
      data.尝试突破 = data.修炼状态.阶段 === "突破中";
      const realmInfo = (0, _common__WEBPACK_IMPORTED_MODULE_1__.computeRealmInfo)(data, false);
      return {
        ...data,
        ...realmInfo
      };
    });
    const NpcSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      所在宗门: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("散修"),
      备注: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    });
  },
  "./src/灯火阑珊/schema/common.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CultivationStateSchema: () => CultivationStateSchema,
      InventorySchema: () => InventorySchema,
      ItemSchema: () => ItemSchema,
      NormalizedStringListSchema: () => NormalizedStringListSchema,
      RealmTransitionSchema: () => RealmTransitionSchema,
      SkillListSchema: () => SkillListSchema,
      SkillSchema: () => SkillSchema,
      computeRealmInfo: () => computeRealmInfo,
      describeRealmByLevel: () => describeRealmByLevel,
      extractSpiritStoneFromInventory: () => extractSpiritStoneFromInventory,
      finiteNumber: () => finiteNumber,
      getCultivationStatusLabel: () => getCultivationStatusLabel,
      getRealmThreshold: () => getRealmThreshold,
      isSpiritStoneCurrencyItem: () => isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => migrateLegacyCultivationProgress,
      normalizeCultivationState: () => normalizeCultivationState,
      normalizeRealmLevel: () => normalizeRealmLevel,
      normalizeSpiritStoneState: () => normalizeSpiritStoneState,
      品阶映射: () => 品阶映射,
      熟练度映射: () => 熟练度映射
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./src/灯火阑珊/schema/constants.ts");
    var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ "./src/灯火阑珊/schema/utils.ts");
    function finiteNumber(fallback = 0) {
      return zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().catch(fallback);
    }
    const NormalizedStringListSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value ? [ value ] : []) ]).prefault([]).transform(values => _.uniq(values.map(value => value.trim()).filter(Boolean)));
    const 品阶映射 = {
      凡: "凡",
      凡阶: "凡",
      凡级: "凡",
      凡品: "凡",
      黄: "黄",
      黄阶: "黄",
      黄级: "黄",
      黄品: "黄",
      玄: "玄",
      玄阶: "玄",
      玄级: "玄",
      玄品: "玄",
      地: "地",
      地阶: "地",
      地级: "地",
      地品: "地",
      天: "天",
      天阶: "天",
      天级: "天",
      天品: "天",
      仙: "仙",
      仙阶: "仙",
      仙级: "仙",
      仙品: "仙",
      圣: "圣",
      圣阶: "圣",
      圣级: "圣",
      圣品: "圣",
      先天: "先天",
      先天阶: "先天",
      先天级: "先天"
    };
    const 熟练度映射 = {
      入门: "入门",
      初级: "入门",
      初学: "入门",
      新手: "入门",
      熟练: "熟练",
      中级: "熟练",
      娴熟: "熟练",
      小成: "熟练",
      精通: "精通",
      高级: "精通",
      精湛: "精通",
      大成: "大成",
      大师: "大成",
      宗师: "大成",
      圆满: "圆满",
      完美: "圆满",
      极致: "圆满",
      化境: "化境",
      化神: "化境",
      返璞归真: "化境",
      出神入化: "化境"
    };
    function normalizeSkillProficiency(raw) {
      const value = String(raw ?? "").trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
      if (熟练度映射[value]) return 熟练度映射[value];
      if (value.includes("小成")) return "熟练";
      if (value.includes("中成")) return "精通";
      if (value.includes("大圆满")) return "圆满";
      return "入门";
    }
    const ItemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      品阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      数量: finiteNumber(0).transform(v => Math.max(0, Math.floor(v))).prefault(1)
    });
    const 灵石货币别名 = new Set([ "灵石", "下品灵石" ]);
    function normalizeSpiritStoneCurrencyName(value) {
      return String(value ?? "").trim().replace(/\s+/g, "");
    }
    function isSpiritStoneCurrencyItem(key, item) {
      const candidates = [ normalizeSpiritStoneCurrencyName(key), normalizeSpiritStoneCurrencyName(item?.名称) ].filter(Boolean);
      return candidates.some(candidate => 灵石货币别名.has(candidate));
    }
    function extractSpiritStoneFromInventory(inventory) {
      const nextInventory = {};
      let spiritStone = 0;
      for (const [key, item] of Object.entries(inventory ?? {})) {
        if (!item) continue;
        if (isSpiritStoneCurrencyItem(key, item)) {
          const amount = Number(item.数量);
          if (Number.isFinite(amount) && amount > 0) {
            spiritStone += amount;
          }
          continue;
        }
        nextInventory[key] = item;
      }
      return {
        inventory: nextInventory,
        spiritStone
      };
    }
    function normalizeSpiritStoneState(spiritStone, ...inventories) {
      let nextSpiritStone = Number(spiritStone);
      if (!Number.isFinite(nextSpiritStone) || nextSpiritStone < 0) {
        nextSpiritStone = 0;
      }
      const normalizedInventories = inventories.map(inventory => {
        const normalized = extractSpiritStoneFromInventory(inventory);
        nextSpiritStone += normalized.spiritStone;
        return normalized.inventory;
      });
      return {
        spiritStone: nextSpiritStone,
        inventories: normalizedInventories
      };
    }
    const 修炼阶段映射 = {
      修炼中: "修炼中",
      闭关: "修炼中",
      打坐: "修炼中",
      调息: "修炼中",
      瓶颈中: "瓶颈中",
      瓶颈期: "瓶颈中",
      卡关: "瓶颈中",
      受阻: "瓶颈中",
      突破中: "突破中",
      冲关: "突破中",
      破境: "突破中",
      尝试突破: "突破中",
      稳固中: "稳固中",
      巩固中: "稳固中",
      根基未稳: "稳固中",
      压境中: "压境中",
      压制境界: "压境中",
      藏锋养境: "压境中"
    };
    const 突破结果映射 = {
      无: "无",
      "": "无",
      未突破: "无",
      成功: "成功",
      破境成功: "成功",
      渡过: "成功",
      失败: "失败",
      破境失败: "失败",
      冲关失败: "失败"
    };
    const 境界变动类型映射 = {
      无: "无",
      "": "无",
      突破: "突破",
      正常突破: "突破",
      晋升: "突破",
      跨级突破: "跨级突破",
      连续突破: "跨级突破",
      连破: "跨级突破",
      跌境: "跌境",
      境界跌落: "跌境",
      境界倒退: "跌境"
    };
    function normalizeRealmLevel(value) {
      const level = Number(value);
      if (!Number.isFinite(level)) return 1;
      return _.clamp(Math.floor(level), 1, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length);
    }
    const RealmTransitionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => 境界变动类型映射[String(value).trim()] || "无").prefault("无"),
      目标等级: finiteNumber(0).transform(value => Number.isFinite(value) ? _.clamp(Math.floor(value), 0, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length) : 0).prefault(0),
      依据: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(value => String(value).replace(/\s+/gu, " ").trim()).prefault("")
    }).prefault({
      类型: "无",
      目标等级: 0,
      依据: ""
    });
    const CultivationStateSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶段: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 修炼阶段映射[String(v).trim()] || "修炼中").prefault("修炼中"),
      瓶颈原因: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      突破目标: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      上次结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 突破结果映射[String(v).trim()] || "无").prefault("无"),
      境界变动: RealmTransitionSchema
    }).prefault({
      阶段: "修炼中",
      瓶颈原因: "",
      突破目标: "",
      上次结果: "无",
      境界变动: {
        类型: "无",
        目标等级: 0,
        依据: ""
      }
    });
    function describeRealmByLevel(level) {
      const normalizedLevel = normalizeRealmLevel(level);
      const majorIdx = Math.floor((normalizedLevel - 1) / 4);
      const minorIdx = (normalizedLevel - 1) % 4;
      return `${_constants__WEBPACK_IMPORTED_MODULE_1__.REALM_NAMES[majorIdx] ?? "练气"}${_constants__WEBPACK_IMPORTED_MODULE_1__.REALM_STAGES[minorIdx] ?? "初期"}`;
    }
    function resolveRealmThresholds(versionOrLegacyFlag = 3) {
      if (versionOrLegacyFlag === true) {
        return _constants__WEBPACK_IMPORTED_MODULE_1__.CULTIVATION_THRESHOLDS_BY_VERSION[1];
      }
      if (versionOrLegacyFlag === false) {
        return _constants__WEBPACK_IMPORTED_MODULE_1__.CULTIVATION_THRESHOLDS_BY_VERSION[3];
      }
      const normalizedVersion = Math.max(1, Math.floor(Number(versionOrLegacyFlag) || 3));
      return _constants__WEBPACK_IMPORTED_MODULE_1__.CULTIVATION_THRESHOLDS_BY_VERSION[normalizedVersion] ?? _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS;
    }
    function getRealmThreshold(level, versionOrLegacyFlag = 3) {
      const thresholds = resolveRealmThresholds(versionOrLegacyFlag);
      const normalizedLevel = _.clamp(Math.floor(Number(level) || 1), 1, thresholds.length);
      return thresholds[normalizedLevel - 1] ?? thresholds[0] ?? 100;
    }
    function migrateCultivationProgress(level, cultivation, fromVersion = 1, toVersion = 3) {
      const normalizedCultivation = Number(cultivation);
      if (!Number.isFinite(normalizedCultivation) || normalizedCultivation <= 0) {
        return 0;
      }
      const previousThreshold = getRealmThreshold(level, fromVersion);
      const nextThreshold = getRealmThreshold(level, toVersion);
      if (previousThreshold <= 0 || previousThreshold === nextThreshold) {
        return Math.round(normalizedCultivation);
      }
      const progressRatio = normalizedCultivation / previousThreshold;
      const migrated = Math.round(progressRatio * nextThreshold);
      return Math.max(0, migrated);
    }
    function migrateLegacyCultivationProgress(level, cultivation) {
      return migrateCultivationProgress(level, cultivation, 1, 3);
    }
    function normalizeCultivationState(rawState, options) {
      const parsedState = CultivationStateSchema.parse(rawState ?? {});
      const level = normalizeRealmLevel(options.level);
      const threshold = getRealmThreshold(level);
      let phase = parsedState.阶段;
      if (options.legacyAttemptBreakthrough || phase === "突破中") {
        phase = "突破中";
      } else if (phase === "修炼中" && options.cultivation >= threshold) {
        phase = "瓶颈中";
      }
      const transition = _.cloneDeep(parsedState.境界变动);
      if (transition.类型 === "无") {
        transition.目标等级 = 0;
        transition.依据 = "";
      }
      const configuredTarget = transition.类型 !== "无" && transition.类型 !== "跌境" && transition.目标等级 > level ? transition.目标等级 : Math.min(level + 1, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length);
      const nextRealmTarget = level < _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length ? describeRealmByLevel(configuredTarget) : "";
      const shouldHaveBreakthroughTarget = [ "瓶颈中", "突破中", "压境中" ].includes(phase);
      return {
        阶段: phase,
        瓶颈原因: shouldHaveBreakthroughTarget ? parsedState.瓶颈原因 : "",
        突破目标: shouldHaveBreakthroughTarget ? nextRealmTarget : "",
        上次结果: parsedState.上次结果,
        境界变动: transition
      };
    }
    function getCultivationStatusLabel(state, cultivation, threshold) {
      const phase = state?.阶段 || "修炼中";
      if (phase === "突破中") return "突破中";
      if (phase === "稳固中") return "稳固中";
      if (phase === "压境中") return "压境中";
      if (phase === "瓶颈中" || cultivation >= threshold) return "瓶颈期";
      return "修炼中";
    }
    const SkillSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(value => typeof value === "string" ? {
      描述: value
    } : value, zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "功法", "神通", "秘术" ]).prefault("神通"),
      品阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 品阶映射[v] || "凡").catch("凡"),
      熟练度: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => normalizeSkillProficiency(v)).catch("入门"),
      领悟时间: finiteNumber(Date.now()).prefault(() => Date.now()),
      威力等级: finiteNumber(0).optional()
    }).transform(skill => {
      const 品阶权重 = {
        凡: 1,
        黄: 2,
        玄: 3,
        地: 4,
        天: 5,
        仙: 6,
        圣: 7,
        先天: 8
      };
      const 熟练度权重 = {
        入门: 1,
        熟练: 2,
        精通: 3,
        大成: 4,
        圆满: 5,
        化境: 6
      };
      const 品阶值 = 品阶权重[skill.品阶] || 1;
      const 熟练值 = 熟练度权重[skill.熟练度] || 1;
      return {
        ...skill,
        威力等级: 品阶值 * 10 + 熟练值
      };
    }));
    const SkillListSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("神通名"), SkillSchema).prefault({}).transform(skills => _(skills).entries().map(([rawName, skill]) => {
      const name = String(rawName).trim();
      return [ name, {
        ...skill,
        名称: skill.名称 || name
      } ];
    }).filter(([name]) => !!name).fromPairs().value());
    const InventorySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("物品名"), ItemSchema).prefault({}).transform(data => _(data).entries().map(([rawName, item]) => {
      const name = String(rawName).trim();
      return [ name, {
        ...item,
        名称: item.名称 || name
      } ];
    }).filter(([name, item]) => !!name && item.数量 > 0).fromPairs().value());
    function computeRealmInfo(data, includesCombatPower = false) {
      const level = data.等级;
      const 突破阈值 = getRealmThreshold(level);
      const 寿元上限 = _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_LIFESPANS[level - 1] ?? 100;
      const 境界描述 = describeRealmByLevel(level);
      const 寿元状态 = `${data.已活岁月}/${寿元上限}`;
      const 状态 = getCultivationStatusLabel(data.修炼状态, data.修为, 突破阈值);
      const progressRatio = 突破阈值 > 0 ? _.clamp(data.修为 / 突破阈值, 0, 1) : 0;
      const 进度 = `${(progressRatio * 100).toFixed(1)}%`;
      const base = {
        突破阈值,
        寿元上限,
        境界描述,
        寿元状态,
        状态,
        进度
      };
      if (!includesCombatPower) return base;
      const 境界战力 = (0, _utils__WEBPACK_IMPORTED_MODULE_2__.calculateBaseCombatPower)(level);
      const 神通列表 = Object.values(data.神通列表 || {});
      const 最高神通威力 = 神通列表.length > 0 ? Math.max(...神通列表.map(s => s.威力等级 || 0)) : 0;
      const 体质加成 = (() => {
        const 体质 = data.体质 || "";
        if (体质.includes("神")) return 500;
        if (体质.includes("圣")) return 200;
        if (体质.includes("道")) return 100;
        if (体质.includes("灵")) return 50;
        return 0;
      })();
      const 战力值 = 境界战力 + 最高神通威力 + 体质加成;
      return {
        ...base,
        战力值
      };
    }
  },
  "./src/灯火阑珊/schema/constants.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CONFIG: () => CONFIG,
      CULTIVATION_THRESHOLDS_BY_VERSION: () => CULTIVATION_THRESHOLDS_BY_VERSION,
      LEGACY_REALM_THRESHOLDS: () => LEGACY_REALM_THRESHOLDS,
      REALM_LIFESPANS: () => REALM_LIFESPANS,
      REALM_NAMES: () => REALM_NAMES,
      REALM_STAGES: () => REALM_STAGES,
      REALM_THRESHOLDS: () => REALM_THRESHOLDS,
      REALM_THRESHOLDS_V2: () => REALM_THRESHOLDS_V2
    });
    const REALM_STAGES = [ "初期", "中期", "后期", "大圆满" ];
    const REALM_NAMES = [ "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫", "真仙", "仙王", "仙帝" ];
    const LEGACY_REALM_THRESHOLDS = [ 100, 200, 300, 400, 500, 600, 700, 800, 900, 1e3, 1100, 1200, 2400, 2400, 2400, 2400, 4800, 4800, 4800, 4800, 9600, 9600, 9600, 9600, 19200, 19200, 19200, 19200, 38400, 38400, 38400, 38400, 76800, 76800, 76800, 76800, 153600, 153600, 153600, 153600, 307200, 307200, 307200, 307200, 614400, 614400, 614400, 614400 ];
    const V2_REALM_MAJOR_BASES = [ 100, 160, 260, 420, 680, 1100, 1780, 2880, 4660, 7540, 12200, 19740 ];
    const V2_REALM_MINOR_MULTIPLIERS = [ 1, 1.18, 1.38, 1.6 ];
    const REALM_THRESHOLDS_V2 = V2_REALM_MAJOR_BASES.flatMap(base => V2_REALM_MINOR_MULTIPLIERS.map(multiplier => Math.round(base * multiplier)));
    const REALM_THRESHOLDS = [ 100, 200, 300, 400, 500, 600, 700, 800, 900, 1e3, 1100, 1200, 2400, 2880, 3360, 3840, 4800, 5760, 6720, 7680, 9600, 11520, 13440, 15360, 19200, 23040, 26880, 30720, 38400, 46080, 53760, 61440, 76800, 92160, 107520, 122880, 153600, 184320, 215040, 245760, 307200, 368640, 430080, 491520, 614400, 737280, 860160, 983040 ];
    const CULTIVATION_THRESHOLDS_BY_VERSION = {
      1: LEGACY_REALM_THRESHOLDS,
      2: REALM_THRESHOLDS_V2,
      3: REALM_THRESHOLDS
    };
    const REALM_LIFESPANS = [ 100, 100, 100, 100, 200, 200, 200, 200, 500, 500, 500, 500, 1e3, 1e3, 1e3, 1e3, 2e3, 2e3, 2e3, 2e3, 5e3, 5e3, 5e3, 5e3, 1e4, 1e4, 1e4, 1e4, 5e4, 5e4, 5e4, 5e4, 1e5, 1e5, 1e5, 1e5, 5e5, 5e5, 5e5, 5e5, 2e6, 2e6, 2e6, 2e6, 1e7, 1e7, 1e7, 1e7 ];
    const CONFIG = {
      REALMS: {
        MAJOR: REALM_NAMES,
        MINOR: REALM_STAGES
      },
      ELEMENTS: {
        火: {
          effect: "灼烧",
          visual: "烈焰",
          nature: "爆裂",
          color: "#ff4444"
        },
        水: {
          effect: "缠绕",
          visual: "激流",
          nature: "柔韧",
          color: "#4488ff"
        },
        冰: {
          effect: "冻结",
          visual: "寒霜",
          nature: "极寒",
          color: "#88ddff"
        },
        雷: {
          effect: "麻痹",
          visual: "紫电",
          nature: "狂暴",
          color: "#aa44ff"
        },
        风: {
          effect: "切割",
          visual: "罡风",
          nature: "无形",
          color: "#88ff88"
        },
        土: {
          effect: "镇压",
          visual: "岩铠",
          nature: "厚重",
          color: "#aa8844"
        },
        木: {
          effect: "寄生",
          visual: "藤蔓",
          nature: "生生不息",
          color: "#44aa44"
        },
        金: {
          effect: "穿透",
          visual: "锐金",
          nature: "锋利",
          color: "#ffdd44"
        },
        暗: {
          effect: "腐蚀",
          visual: "黑雾",
          nature: "诡谲",
          color: "#442244"
        },
        光: {
          effect: "净化",
          visual: "圣辉",
          nature: "神圣",
          color: "#ffffaa"
        },
        混沌: {
          effect: "湮灭",
          visual: "灰光",
          nature: "虚无",
          color: "#888888"
        }
      }
    };
  },
  "./src/灯火阑珊/schema/protagonist.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ProtagonistSchema: () => ProtagonistSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const 战斗状态映射 = {
      非战斗: "非战斗",
      和平: "非战斗",
      安全: "非战斗",
      脱战: "非战斗",
      对峙: "对峙",
      警戒: "对峙",
      僵持: "对峙",
      对视: "对峙",
      激战: "激战",
      战斗: "激战",
      交战: "激战",
      厮杀: "激战",
      重伤: "重伤",
      负伤: "重伤",
      伤重: "重伤",
      濒死: "濒死",
      将死: "濒死",
      垂危: "濒死",
      危急: "濒死"
    };
    const 伤势映射 = {
      无伤: "无伤",
      无: "无伤",
      完好: "无伤",
      健康: "无伤",
      轻伤: "轻伤",
      小伤: "轻伤",
      微伤: "轻伤",
      重伤: "重伤",
      伤重: "重伤",
      大伤: "重伤",
      濒死: "濒死",
      将死: "濒死",
      垂危: "濒死"
    };
    const 战力评估映射 = {
      碾压: "碾压",
      压倒: "碾压",
      秒杀: "碾压",
      吊打: "碾压",
      优势: "优势",
      占优: "优势",
      上风: "优势",
      有利: "优势",
      势均力敌: "势均力敌",
      均势: "势均力敌",
      平手: "势均力敌",
      相当: "势均力敌",
      旗鼓相当: "势均力敌",
      劣势: "劣势",
      下风: "劣势",
      不利: "劣势",
      落后: "劣势",
      绝望: "绝望",
      必死: "绝望",
      碾压劣势: "绝望",
      无望: "绝望"
    };
    const 敌人状态映射 = {
      完好: "完好",
      无伤: "完好",
      健康: "完好",
      全盛: "完好",
      轻伤: "轻伤",
      小伤: "轻伤",
      微伤: "轻伤",
      重伤: "重伤",
      伤重: "重伤",
      大伤: "重伤",
      濒死: "濒死",
      将死: "濒死",
      垂危: "濒死",
      已死: "已死",
      死亡: "已死",
      击杀: "已死",
      阵亡: "已死"
    };
    const 劫种映射 = {
      无: "无",
      "": "无",
      无劫: "无",
      雷劫: "雷劫",
      天雷: "雷劫",
      雷: "雷劫",
      心劫: "心劫",
      心魔: "心劫",
      魔劫: "心劫",
      天劫: "天劫",
      大劫: "天劫",
      情劫: "情劫",
      情关: "情劫",
      因果劫: "因果劫",
      因果: "因果劫",
      红尘劫: "红尘劫",
      红尘: "红尘劫",
      轮回劫: "轮回劫",
      轮回: "轮回劫"
    };
    const 劫难等级映射 = {
      无: "无",
      无劫: "无",
      小劫: "小劫",
      小: "小劫",
      初级: "小劫",
      中劫: "中劫",
      中: "中劫",
      中级: "中劫",
      大劫: "大劫",
      大: "大劫",
      高级: "大劫",
      天罚: "天罚",
      天: "天罚",
      极: "天罚",
      天道: "天罚"
    };
    const 渡劫结果映射 = {
      无: "无",
      "": "无",
      未渡劫: "无",
      成功: "成功",
      通过: "成功",
      渡过: "成功",
      失败: "失败",
      未过: "失败",
      失: "失败"
    };
    const CombatStatusSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正在战斗: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      当前状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 战斗状态映射[v] || "非战斗").prefault("非战斗"),
      灵力值: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(100).transform(v => _.clamp(v, 0, 100)).prefault(100),
      伤势等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 伤势映射[v] || "无伤").prefault("无伤"),
      已用底牌: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema,
      战斗回合: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, Math.floor(v))).prefault(0)
    }).prefault({
      正在战斗: false,
      当前状态: "非战斗",
      灵力值: 100,
      伤势等级: "无伤",
      已用底牌: [],
      战斗回合: 0
    });
    const EnemySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("未知敌人"),
      境界: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("未知"),
      战力评估: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 战力评估映射[v] || "势均力敌").prefault("势均力敌"),
      状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 敌人状态映射[v] || "完好").prefault("完好"),
      特点: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    });
    const TribulationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正在渡劫: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      劫种: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 劫种映射[v] || "无").prefault("无"),
      劫难等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 劫难等级映射[v] || "无").prefault("无"),
      当前阶段: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, 0, 9)).prefault(0),
      总阶段数: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, 0, 9)).prefault(0),
      劫力承受: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(100).transform(v => _.clamp(v, 0, 100)).prefault(100),
      已用护道: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema,
      劫难描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      触发原因: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      上次渡劫结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 渡劫结果映射[v] || "无").prefault("无"),
      渡劫冷却: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      失败惩罚记录: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({
      正在渡劫: false,
      劫种: "无",
      劫难等级: "无",
      当前阶段: 0,
      总阶段数: 0,
      劫力承受: 100,
      已用护道: [],
      劫难描述: "",
      触发原因: "",
      上次渡劫结果: "无",
      渡劫冷却: 0,
      失败惩罚记录: ""
    }).transform(data => {
      if (data.正在渡劫) {
        return {
          ...data,
          劫难等级: data.劫难等级 === "无" ? "小劫" : data.劫难等级,
          当前阶段: _.clamp(data.当前阶段, 0, 9),
          总阶段数: _.clamp(Math.max(data.总阶段数 || 3, data.当前阶段, 1), 1, 9)
        };
      }
      return {
        ...data,
        劫种: "无",
        劫难等级: "无",
        当前阶段: 0,
        总阶段数: 0,
        劫难描述: "",
        触发原因: ""
      };
    });
    const LocationTrackSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      当前区域: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("未知之地"),
      所属层级: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("地层"),
      环境描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      危险度: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(10).transform(v => _.clamp(v, 0, 100)).prefault(10),
      可用通道: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema,
      导航信息: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({
      当前区域: "未知之地",
      所属层级: "地层",
      环境描述: "",
      危险度: 10,
      可用通道: [],
      导航信息: ""
    });
    const IdentitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      姓名: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无名氏"),
      宗门: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("散修"),
      出身: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡人")
    }).prefault({
      姓名: "无名氏",
      宗门: "散修",
      出身: "凡人"
    });
    const ProtagonistSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      修为: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      灵根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("五行杂灵根"),
      体质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡体"),
      功法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      本命兵器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      神通列表: _common__WEBPACK_IMPORTED_MODULE_1__.SkillListSchema,
      灵石: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      已活岁月: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      尝试突破: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      修炼状态: _common__WEBPACK_IMPORTED_MODULE_1__.CultivationStateSchema,
      行踪: LocationTrackSchema,
      身份: IdentitySchema,
      背包: _common__WEBPACK_IMPORTED_MODULE_1__.InventorySchema,
      法宝: _common__WEBPACK_IMPORTED_MODULE_1__.InventorySchema,
      杂物袋: _common__WEBPACK_IMPORTED_MODULE_1__.InventorySchema,
      战斗状态: CombatStatusSchema,
      当前敌人: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(EnemySchema).prefault([]),
      渡劫状态: TribulationSchema
    }).prefault({
      等级: 1,
      修为: 0,
      灵根: "五行杂灵根",
      体质: "凡体",
      功法: "无",
      本命兵器: "无",
      神通列表: {},
      灵石: 0,
      已活岁月: 0,
      尝试突破: false,
      修炼状态: {
        阶段: "修炼中",
        瓶颈原因: "",
        突破目标: "",
        上次结果: "无",
        境界变动: {
          类型: "无",
          目标等级: 0,
          依据: ""
        }
      },
      行踪: {
        当前区域: "未知之地",
        所属层级: "地层",
        环境描述: "",
        危险度: 10,
        可用通道: [],
        导航信息: ""
      },
      身份: {
        姓名: "无名氏",
        宗门: "散修",
        出身: "凡人"
      },
      背包: {},
      法宝: {},
      杂物袋: {},
      战斗状态: {
        正在战斗: false,
        当前状态: "非战斗",
        灵力值: 100,
        伤势等级: "无伤",
        已用底牌: [],
        战斗回合: 0
      },
      当前敌人: [],
      渡劫状态: {
        正在渡劫: false,
        劫种: "无",
        劫难等级: "无",
        当前阶段: 0,
        总阶段数: 0,
        劫力承受: 100,
        已用护道: [],
        劫难描述: "",
        触发原因: "",
        上次渡劫结果: "无",
        渡劫冷却: 0,
        失败惩罚记录: ""
      }
    }).transform(data => {
      const spiritStoneNormalization = (0, _common__WEBPACK_IMPORTED_MODULE_1__.normalizeSpiritStoneState)(data.灵石, data.背包, data.杂物袋);
      const [normalizedBackpack, normalizedMiscBag] = spiritStoneNormalization.inventories;
      data.灵石 = spiritStoneNormalization.spiritStone;
      data.背包 = normalizedBackpack ?? {};
      data.杂物袋 = normalizedMiscBag ?? {};
      data.修炼状态 = (0, _common__WEBPACK_IMPORTED_MODULE_1__.normalizeCultivationState)(data.修炼状态, {
        legacyAttemptBreakthrough: data.尝试突破,
        level: data.等级,
        cultivation: data.修为
      });
      data.尝试突破 = data.修炼状态.阶段 === "突破中";
      const realmInfo = (0, _common__WEBPACK_IMPORTED_MODULE_1__.computeRealmInfo)(data, true);
      return {
        ...data,
        ...realmInfo
      };
    });
  },
  "./src/灯火阑珊/schema/systems.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ActionSystemSettingsSchema: () => ActionSystemSettingsSchema,
      DifficultySystemSchema: () => DifficultySystemSchema,
      OpportunitySchema: () => OpportunitySchema,
      QuestSchema: () => QuestSchema,
      ReputationEntrySchema: () => ReputationEntrySchema,
      ReputationSystemSchema: () => ReputationSystemSchema,
      SystemSettingsSchema: () => SystemSettingsSchema,
      unwrapOpportunityPatchPayload: () => unwrapOpportunityPatchPayload
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const 任务状态映射 = {
      进行中: "进行中",
      进行: "进行中",
      处理中: "进行中",
      未完成: "进行中",
      待完成: "进行中",
      未开始: "进行中",
      已接取: "进行中",
      接取: "进行中",
      active: "进行中",
      已完成: "已完成",
      完成: "已完成",
      完成了: "已完成",
      已达成: "已完成",
      达成: "已完成",
      已结束: "已完成",
      结束: "已完成",
      done: "已完成",
      complete: "已完成",
      completed: "已完成",
      已失败: "已失败",
      失败: "已失败",
      失敗: "已失败",
      失败了: "已失败",
      中止: "已失败",
      终止: "已失败",
      放弃: "已失败",
      超时失败: "已失败",
      failed: "已失败",
      fail: "已失败"
    };
    const 任务类型映射 = {
      主线: "主线",
      主任务: "主线",
      主线任务: "主线",
      main: "主线",
      支线: "支线",
      支线任务: "支线",
      side: "支线",
      sidequest: "支线",
      每日: "每日",
      日常: "每日",
      每日任务: "每日",
      daily: "每日",
      临危受命: "临危受命",
      紧急: "临危受命",
      紧急任务: "临危受命",
      urgent: "临危受命",
      秘境探索: "秘境探索",
      秘境: "秘境探索",
      探索: "秘境探索",
      秘境任务: "秘境探索",
      dungeon: "秘境探索",
      修炼: "支线",
      修炼任务: "支线"
    };
    const QuestSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 任务类型映射[String(v).trim()] || "支线").prefault("主线"),
      目标: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 任务状态映射[String(v).trim()] || "进行中").prefault("进行中"),
      秘境信息: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        域: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "天层", "神州", "东苍", "南炎", "西庚", "北冥", "下层", "四海" ]).optional(),
        危: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, 0, 100)).optional(),
        特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
        奖: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema,
        限: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional()
      }).optional(),
      创建时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(Date.now()), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(() => Date.now()) ]).prefault(() => Date.now())
    });
    const ReputationEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      值: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, -100, 100)).prefault(0),
      关系: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("陌生"),
      更新时间: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(Date.now()).prefault(() => Date.now())
    });
    const ReputationSystemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("势力名"), ReputationEntrySchema).prefault({}).transform(factions => {
      const autoRelationLabels = new Set([ "陌生", "盟友", "友善", "友好", "中立偏好", "中立", "中立偏恶", "敌对", "仇恨", "不死不休" ]);
      return _(factions).mapValues(faction => {
        const value = faction.值;
        let 自动关系;
        if (value >= 80) {
          自动关系 = "盟友";
        } else if (value >= 60) {
          自动关系 = "友善";
        } else if (value >= 30) {
          自动关系 = "友好";
        } else if (value >= 10) {
          自动关系 = "中立偏好";
        } else if (value >= -10) {
          自动关系 = "中立";
        } else if (value >= -30) {
          自动关系 = "中立偏恶";
        } else if (value >= -60) {
          自动关系 = "敌对";
        } else if (value >= -80) {
          自动关系 = "仇恨";
        } else {
          自动关系 = "不死不休";
        }
        const 最终关系 = faction.关系 && !autoRelationLabels.has(faction.关系) ? faction.关系 : 自动关系;
        return {
          ...faction,
          关系: 最终关系
        };
      }).value();
    });
    const 机遇类型映射 = {
      探索: "探索",
      行动: "探索",
      冒险: "探索",
      机缘: "探索",
      机遇: "探索",
      奇遇: "探索",
      秘境: "探索",
      寻宝: "探索",
      交涉: "交涉",
      结交: "交涉",
      交谈: "交涉",
      社交: "交涉",
      互动: "交涉",
      邀约: "交涉",
      邂逅: "交涉",
      战斗: "战斗",
      争夺: "战斗",
      挑战: "战斗",
      修炼: "修炼",
      整备: "整备",
      交易: "整备",
      采购: "整备",
      易物: "整备",
      买卖: "整备",
      红颜: "亲密",
      双修: "亲密",
      亲密: "亲密",
      调情: "亲密"
    };
    const 机遇类型推断规则 = [ {
      type: "亲密",
      pattern: /红颜|佳人|道侣|双修|温情|独处|相拥|相守|调情|缠绵|共寝|同眠|亲吻|亲密|忘忧|听雨|清弦|晚棠|云裳|梦杳泠|朔璃鸢|阿鸢|血手飞鸢|朔望舒|赤月女帝|幽影宗主|虞汐|虞颜|虞汐颜/
    }, {
      type: "修炼",
      pattern: /修炼|闭关|打坐|吐纳|调息|冲关|破境|突破|压境|稳固|悟道|渡劫|根基|炼化|参悟/
    }, {
      type: "整备",
      pattern: /整备|修复|炼器|疗伤|丹药|灵阵|阵纹|坊市|易物|交易|买卖|采购|拍卖|商会|补给|售卖|收购|置换/
    }, {
      type: "战斗",
      pattern: /战斗|争夺|夺取|抢夺|截杀|斗法|厮杀|围攻|追杀|迎战|强敌|魔修|冲突|守擂|比斗/
    }, {
      type: "交涉",
      pattern: /交涉|交谈|结交|拜访|邀约|会面|结识|拉拢|试探|求见|访友|赴宴|询问|劝说|谈判|论道|同游/
    }, {
      type: "探索",
      pattern: /探索|探查|调查|追查|搜寻|寻找|寻路|赶路|潜入|护送|营救|赴约|秘境|线索|遗迹|洞穴/
    } ];
    function normalizeOpportunityText(value) {
      return String(value ?? "").trim();
    }
    function inferOpportunityType(rawType, payload) {
      const mappedType = 机遇类型映射[rawType];
      if (mappedType) return mappedType;
      const text = Object.values(payload).map(value => normalizeOpportunityText(value)).filter(Boolean).join("｜");
      for (const rule of 机遇类型推断规则) {
        if (rule.pattern.test(text)) return rule.type;
      }
      return "探索";
    }
    function buildLegacyOpportunityHint(timeLimit, risk) {
      const parts = [ /^(?:无|无时限|不限)$/u.test(timeLimit) ? "" : timeLimit, /^(?:无|无风险)$/u.test(risk) ? "" : risk ].filter(Boolean);
      return _.uniq(parts).join(" · ");
    }
    function getOpportunityPatchIndex(value) {
      if (!value || typeof value !== "object" || Array.isArray(value) || "行动" in value) return undefined;
      const wrapper = value;
      if (![ "replace", "insert" ].includes(String(wrapper.op ?? "")) || !Object.hasOwn(wrapper, "value")) {
        return undefined;
      }
      const normalizedPath = String(wrapper.path ?? "").trim().replace(/^\/+/u, "").replace(/^stat_data[./]/u, "").replaceAll("/", ".");
      if (normalizedPath === "可参与机遇") return null;
      const indexMatch = /^可参与机遇\.(\d+)$/u.exec(normalizedPath);
      return indexMatch ? Number(indexMatch[1]) : undefined;
    }
    function unwrapOpportunityPatchLayer(value) {
      const directIndex = getOpportunityPatchIndex(value);
      if (directIndex === null) {
        return {
          changed: true,
          value: value.value
        };
      }
      if (!Array.isArray(value) || value.length === 0) {
        return {
          changed: false,
          value
        };
      }
      if (value.length === 1 && getOpportunityPatchIndex(value[0]) === null) {
        return {
          changed: true,
          value: value[0].value
        };
      }
      const indexedEntries = value.map(item => ({
        index: getOpportunityPatchIndex(item),
        value: item?.value
      }));
      if (indexedEntries.some(entry => typeof entry.index !== "number")) {
        return {
          changed: false,
          value
        };
      }
      return {
        changed: true,
        value: _(indexedEntries).sortBy("index").map("value").value()
      };
    }
    function collectEmbeddedOpportunityItems(value, depth = 0) {
      if (depth > 6) return [];
      if (Array.isArray(value)) {
        return value.flatMap(item => collectEmbeddedOpportunityItems(item, depth + 1));
      }
      if (!value || typeof value !== "object") return [];
      const item = value;
      if (Object.hasOwn(item, "行动") || Object.hasOwn(item, "名称") || Object.hasOwn(item, "描述")) {
        return [ item ];
      }
      if (Object.hasOwn(item, "value") && (Object.hasOwn(item, "op") || Object.hasOwn(item, "path"))) {
        return collectEmbeddedOpportunityItems(item.value, depth + 1);
      }
      return [];
    }
    function unwrapOpportunityPatchPayload(value) {
      let current = value;
      if (typeof current === "string" && current.trimStart().startsWith("[")) {
        try {
          current = JSON.parse(current);
        } catch {
          return value;
        }
      }
      for (let depth = 0; depth < 4; depth += 1) {
        const layer = unwrapOpportunityPatchLayer(current);
        if (!layer.changed) break;
        current = layer.value;
      }
      const recoveredItems = collectEmbeddedOpportunityItems(current);
      return recoveredItems.length > 0 ? recoveredItems : current;
    }
    const CompactOpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      行动: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault("探索"),
      提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional()
    });
    const LegacyOpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      来源: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault("探索"),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      回报预期: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      风险评估: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      时限: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      关联事件: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      优先级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).optional()
    });
    const OpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ CompactOpportunitySchema, LegacyOpportunitySchema ]).transform(item => {
      if ("行动" in item) {
        const hint = normalizeOpportunityText(item.提示);
        return {
          行动: item.行动,
          类型: inferOpportunityType(item.类型, {
            行动: item.行动,
            提示: hint
          }),
          ...hint ? {
            提示: hint
          } : {}
        };
      }
      const action = item.描述 || item.名称;
      const hint = buildLegacyOpportunityHint(item.时限 ?? "", item.风险评估);
      return {
        行动: action,
        类型: inferOpportunityType(item.类型, {
          名称: item.名称,
          来源: item.来源,
          描述: item.描述,
          回报预期: item.回报预期,
          风险评估: item.风险评估,
          时限: item.时限 ?? "",
          关联事件: item.关联事件 ?? ""
        }),
        ...hint ? {
          提示: hint
        } : {}
      };
    });
    const SystemSettingsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      启用行动提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(true),
      修炼系统版本: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(value => Math.max(1, Math.floor(value))).prefault(1),
      变量结构版本: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(value => Math.max(1, Math.floor(value))).prefault(1),
      _临时状态手动覆盖签名: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const ActionSystemSettingsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      启用行动提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(true)
    }).prefault({});
    const 天道感应映射 = {
      顺遂: "顺遂",
      受挫: "受挫",
      平稳: "平稳",
      顺利: "顺遂",
      受阻: "受挫",
      正常: "平稳"
    };
    const DifficultySystemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      天道感应: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 天道感应映射[String(v).trim()] || "平稳").prefault("平稳"),
      环境高压警告: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("天道运转如常，万物循理。"),
      _难度系统内部数据: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        版本号: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(value => Math.max(1, Math.floor(value))).prefault(1),
        平衡保护: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          连续受挫计数: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).prefault(0),
          触发阈值: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(3).prefault(3),
          生效剩余回合: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).prefault(0),
          冷却剩余回合: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).prefault(0)
        }).prefault({}),
        动态策略: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          单回合改变量上限: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(.15).prefault(.15),
          自然回落速度: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(.03).prefault(.03),
          增长冷却回合: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(2).prefault(2)
        }).prefault({}),
        难度结算快照: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          回合基线系数: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).prefault(1),
          本回合最终系数: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).prefault(1),
          分层来源: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
            世界叙事层: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).prefault(1),
            玩家偏好层: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).prefault(1),
            短期状态层: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).prefault(1)
          }).prefault({})
        }).prefault({})
      }).prefault({})
    }).prefault({});
  },
  "./src/灯火阑珊/schema/utils.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      calculateBaseCombatPower: () => calculateBaseCombatPower,
      evaluateCombatPower: () => evaluateCombatPower,
      getDangerColor: () => getDangerColor,
      getRealmColor: () => getRealmColor,
      getRootColor: () => getRootColor,
      parseRealmToLevel: () => parseRealmToLevel
    });
    var _constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants */ "./src/灯火阑珊/schema/constants.ts");
    function getRootColor(root) {
      for (const [elem, data] of Object.entries(_constants__WEBPACK_IMPORTED_MODULE_0__.CONFIG.ELEMENTS)) {
        if (root.includes(elem)) {
          return data.color;
        }
      }
      return "#cc99ff";
    }
    function getRealmColor(level) {
      const majorIdx = Math.floor((level - 1) / 4);
      const colors = [ "#888888", "#44aa44", "#4488ff", "#aa44ff", "#ff4444", "#ffaa00", "#ffdd44", "#ffffff", "#ff88ff", "#66e0ff", "#c7a6ff", "#ffd166" ];
      return colors[majorIdx] || "#888888";
    }
    function getDangerColor(danger) {
      if (danger >= 90) return "#ff0000";
      if (danger >= 70) return "#ff4400";
      if (danger >= 50) return "#ff8800";
      if (danger >= 30) return "#ffcc00";
      return "#44aa44";
    }
    function parseRealmToLevel(realm) {
      let majorIdx = -1;
      for (let i = 0; i < _constants__WEBPACK_IMPORTED_MODULE_0__.REALM_NAMES.length; i++) {
        if (realm.includes(_constants__WEBPACK_IMPORTED_MODULE_0__.REALM_NAMES[i])) {
          majorIdx = i;
          break;
        }
      }
      if (majorIdx === -1) return 1;
      let minorIdx = 0;
      for (let i = 0; i < _constants__WEBPACK_IMPORTED_MODULE_0__.REALM_STAGES.length; i++) {
        if (realm.includes(_constants__WEBPACK_IMPORTED_MODULE_0__.REALM_STAGES[i])) {
          minorIdx = i;
          break;
        }
      }
      return majorIdx * 4 + minorIdx + 1;
    }
    function calculateBaseCombatPower(level) {
      const majorIdx = Math.floor((level - 1) / 4);
      const minorIdx = (level - 1) % 4;
      const 大境界基础 = Math.pow(10, majorIdx + 1);
      const 小境界加成 = 大境界基础 * .2 * minorIdx;
      return Math.round(大境界基础 + 小境界加成);
    }
    function evaluateCombatPower(myPower, enemyPower) {
      const ratio = myPower / enemyPower;
      if (ratio >= 2) return "碾压";
      if (ratio >= 1.3) return "优势";
      if (ratio >= .8) return "势均力敌";
      if (ratio >= .5) return "劣势";
      return "绝望";
    }
  },
  "./src/灯火阑珊/schema/world.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      DEFAULT_FACTIONS: () => DEFAULT_FACTIONS,
      DEFAULT_LOCATIONS: () => DEFAULT_LOCATIONS,
      DEFAULT_TREASURES: () => DEFAULT_TREASURES,
      FactionSchema: () => FactionSchema,
      LocationSchema: () => LocationSchema,
      PhysiqueSchema: () => PhysiqueSchema,
      SpiritRootSchema: () => SpiritRootSchema,
      TechniqueSchema: () => TechniqueSchema,
      TreasureSchema: () => TreasureSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const FactionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      地: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录"),
      力: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      营: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "正", "魔", "中" ]).catch("中").prefault("中"),
      模: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "超大", "大", "小", "微", "特" ]).catch("小").prefault("小")
    }).prefault({});
    const TechniqueSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => _common__WEBPACK_IMPORTED_MODULE_1__["品阶映射"][v] || "凡").catch("凡").prefault("凡"),
      性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      效: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录")
    }).prefault({});
    const TreasureSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "凡器", "法器", "灵器", "法宝", "灵宝", "仙器", "圣器", "道器", "本命" ]).catch("凡器").prefault("凡器"),
      类: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      本命特性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).optional(),
      器灵: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).optional()
    }).prefault({}).transform(data => ({
      ...data,
      特: data.阶 === "本命" ? "至尊" : data.阶 === "道器" ? "超凡" : data.阶 === "圣器" ? "极品" : data.阶 === "仙器" ? "顶级" : data.阶 === "灵宝" ? "强" : data.阶 === "法宝" ? "中" : "普通"
    }));
    const LocationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      域: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "天层", "神州", "东苍", "南炎", "西庚", "北冥", "下层", "四海" ]).catch("神州").prefault("神州"),
      类: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "秘境", "城镇", "宗门", "禁地", "遗迹", "地形" ]).catch("地形").prefault("地形"),
      危: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)).catch(10).prefault(10),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录"),
      资: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema
    }).prefault({});
    const SpiritRootSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "劣", "下", "中", "上", "极", "天", "异" ]).catch("中").prefault("中"),
      性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      稀: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "常", "少", "罕", "稀", "传" ]).catch("常").prefault("常")
    }).prefault({}).transform(data => {
      const 速度映射 = {
        劣: "0.3倍",
        下: "0.5倍",
        中: "1倍",
        上: "2倍",
        极: "3倍",
        天: "5倍",
        异: "4倍"
      };
      return {
        ...data,
        速: 速度映射[data.质] || "1倍",
        特: data.质 === "天" ? "单系顶级" : data.质 === "异" ? "变异稀有" : data.质 === "极" ? "双系优秀" : "常规"
      };
    });
    const PhysiqueSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "凡", "灵", "道", "圣", "神" ]).catch("凡").prefault("凡"),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录"),
      稀: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "常", "少", "罕", "稀", "传" ]).catch("常").prefault("常")
    }).prefault({}).transform(data => ({
      ...data,
      优: data.质 === "神" ? "至高" : data.质 === "圣" ? "极强" : data.质 === "道" ? "强" : data.质 === "灵" ? "中" : "无"
    }));
    const DEFAULT_FACTIONS = {
      剑阁: {
        地: "神州剑门关",
        特: "剑道源头",
        力: "渡劫后期",
        营: "正",
        模: "超大"
      },
      万法宗: {
        地: "神州问道峰",
        特: "万法本源",
        力: "渡劫初期",
        营: "正",
        模: "超大"
      },
      金刚寺: {
        地: "西天佛山",
        特: "佛修炼体",
        力: "大乘中期",
        营: "正",
        模: "大"
      },
      药王谷: {
        地: "神农架",
        特: "医炼丹药",
        力: "大乘初期",
        营: "正",
        模: "大"
      },
      儒门: {
        地: "文圣山",
        特: "浩然正气",
        力: "大乘中期",
        营: "正",
        模: "大"
      },
      青龙殿: {
        地: "东苍青龙山",
        特: "守护青帝",
        力: "大乘初期",
        营: "正",
        模: "大"
      },
      玄武宗: {
        地: "北冥玄冰山",
        特: "镇守归墟",
        力: "大乘后期",
        营: "正",
        模: "大"
      },
      青云门: {
        地: "神州青云山",
        特: "水脉一系",
        力: "大乘初期",
        营: "正",
        模: "大"
      },
      建木宗: {
        地: "东苍建木树",
        特: "木系道法",
        力: "合体中期",
        营: "正",
        模: "小"
      },
      百花谷: {
        地: "百花秘境",
        特: "女修花道",
        力: "合体后期",
        营: "正",
        模: "小"
      },
      血神教: {
        地: "血魔渊",
        特: "血道炼法",
        力: "渡劫中期",
        营: "魔",
        模: "超大"
      },
      天魔宗: {
        地: "天魔山",
        特: "天魔大道",
        力: "大乘中期",
        营: "魔",
        模: "大"
      },
      妖盟: {
        地: "万妖森林",
        特: "妖族联盟",
        力: "渡劫中期",
        营: "中",
        模: "超大"
      },
      大夏王朝: {
        地: "中州皇城",
        特: "世俗统治",
        力: "大乘初期",
        营: "中",
        模: "大"
      },
      九州商会: {
        地: "九大主城",
        特: "商业联盟",
        力: "大乘初期",
        营: "中",
        模: "大"
      },
      离火宫: {
        地: "南炎火山",
        特: "朱雀供奉",
        力: "合体圆满",
        营: "中",
        模: "小"
      },
      铸剑山庄: {
        地: "南炎地火",
        特: "炼器第一",
        力: "合体后期",
        营: "中",
        模: "小"
      }
    };
    const DEFAULT_TREASURES = {
      镇渊剑: {
        阶: "仙器",
        类: "剑"
      },
      双鱼佩: {
        阶: "本命",
        类: "玉佩",
        本命特性: "源血契约、阴阳双生、器灵化形、与主共修、生死相依、锁血护主",
        器灵: "虞汐颜"
      }
    };
    const DEFAULT_LOCATIONS = {
      天渊: {
        域: "天层",
        类: "禁地",
        危: 95,
        特: "星辰裂隙",
        资: [ "星辰碎片", "陨铁" ]
      },
      罡风带: {
        域: "天层",
        类: "禁地",
        危: 90,
        特: "罡风屏障",
        资: [ "罡风精华" ]
      },
      问道峰: {
        域: "神州",
        类: "宗门",
        危: 10,
        特: "万法宗",
        资: [ "功法", "灵药" ]
      },
      剑门关: {
        域: "神州",
        类: "宗门",
        危: 15,
        特: "剑阁",
        资: [ "剑意", "飞剑" ]
      },
      藏书阁: {
        域: "神州",
        类: "宗门",
        危: 5,
        特: "古籍",
        资: [ "功法", "秘术" ]
      },
      酆都城: {
        域: "神州",
        类: "城镇",
        危: 30,
        特: "鬼市",
        资: [ "幽冥材料" ]
      },
      龙门瀑: {
        域: "神州",
        类: "秘境",
        危: 40,
        特: "化龙",
        资: [ "龙气" ]
      },
      建木林: {
        域: "东苍",
        类: "地形",
        危: 50,
        特: "古树精",
        资: [ "灵木", "妖丹" ]
      },
      青帝陵: {
        域: "东苍",
        类: "遗迹",
        危: 85,
        特: "青帝传承",
        资: [ "青帝传承" ]
      },
      百花境: {
        域: "东苍",
        类: "秘境",
        危: 20,
        特: "花海",
        资: [ "灵花" ]
      },
      不灭火山: {
        域: "南炎",
        类: "地形",
        危: 80,
        特: "朱雀涅槃",
        资: [ "朱雀火" ]
      },
      涅槃台: {
        域: "南炎",
        类: "遗迹",
        危: 70,
        特: "涅槃",
        资: [ "涅槃感悟" ]
      },
      万剑冢: {
        域: "西庚",
        类: "禁地",
        危: 85,
        特: "剑意",
        资: [ "剑意", "古剑" ]
      },
      玄冰山: {
        域: "北冥",
        类: "宗门",
        危: 50,
        特: "玄武宗",
        资: [ "玄冰" ]
      },
      归墟眼: {
        域: "北冥",
        类: "禁地",
        危: 99,
        特: "归墟",
        资: [ "归墟感悟" ]
      },
      黄泉迹: {
        域: "下层",
        类: "遗迹",
        危: 90,
        特: "幽冥",
        资: [ "黄泉水" ]
      },
      炎渊: {
        域: "下层",
        类: "禁地",
        危: 95,
        特: "地心火",
        资: [ "地心火" ]
      }
    };
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
  /*!********************************!*\
  !*** ./src/踏月寻仙-变量结构/index.ts ***!
  \********************************/
  __webpack_require__.r(__webpack_exports__);
  var https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js */ "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js");
  var _schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../灯火阑珊/schema */ "./src/灯火阑珊/schema.ts");
  var _guard__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../灯火阑珊-变量结构/guard */ "./src/灯火阑珊-变量结构/guard.ts");
  $(() => {
    let stopGuard = () => undefined;
    errorCatched(async () => {
      await waitGlobalInitialized("Mvu");
      (0, https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__.registerMvuSchema)(_schema__WEBPACK_IMPORTED_MODULE_1__.Schema);
      stopGuard = (0, _guard__WEBPACK_IMPORTED_MODULE_2__.installAuthoritativeMvuGuard)();
      console.warn("[灯火阑珊] 正通过旧文件名加载；已转接新版变量结构与权威守卫");
    })();
    $(window).on("pagehide", () => {
      stopGuard();
    });
  });
})();