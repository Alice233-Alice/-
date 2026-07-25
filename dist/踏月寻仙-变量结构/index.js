import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__ from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

var __webpack_modules__ = {
  "./src/踏月寻仙-测试版/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
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
      NpcSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_1__.NpcSchema,
      OpportunitySchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.OpportunitySchema,
      PhysiqueSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_5__.PhysiqueSchema,
      ProtagonistSchema: () => _schema_protagonist__WEBPACK_IMPORTED_MODULE_3__.ProtagonistSchema,
      QuestSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.QuestSchema,
      REALM_LIFESPANS: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_LIFESPANS,
      REALM_NAMES: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_NAMES,
      REALM_STAGES: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_STAGES,
      REALM_THRESHOLDS: () => _schema_constants__WEBPACK_IMPORTED_MODULE_6__.REALM_THRESHOLDS,
      ReputationEntrySchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.ReputationEntrySchema,
      ReputationSystemSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_4__.ReputationSystemSchema,
      Schema: () => Schema,
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
      getCultivationStatusLabel: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.getCultivationStatusLabel,
      getDangerColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.getDangerColor,
      getRealmColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.getRealmColor,
      getRealmThreshold: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.getRealmThreshold,
      getRootColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.getRootColor,
      isSpiritStoneCurrencyItem: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.migrateLegacyCultivationProgress,
      normalizeCultivationState: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeCultivationState,
      normalizeSpiritStoneState: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__.normalizeSpiritStoneState,
      parseRealmToLevel: () => _schema_utils__WEBPACK_IMPORTED_MODULE_7__.parseRealmToLevel,
      品阶映射: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__["品阶映射"],
      熟练度映射: () => _schema_common__WEBPACK_IMPORTED_MODULE_2__["熟练度映射"]
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _schema_characters__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./schema/characters */ "./src/踏月寻仙-测试版/schema/characters.ts");
    var _schema_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./schema/common */ "./src/踏月寻仙-测试版/schema/common.ts");
    var _schema_protagonist__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./schema/protagonist */ "./src/踏月寻仙-测试版/schema/protagonist.ts");
    var _schema_systems__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./schema/systems */ "./src/踏月寻仙-测试版/schema/systems.ts");
    var _schema_world__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./schema/world */ "./src/踏月寻仙-测试版/schema/world.ts");
    var _schema_constants__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./schema/constants */ "./src/踏月寻仙-测试版/schema/constants.ts");
    var _schema_utils__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./schema/utils */ "./src/踏月寻仙-测试版/schema/utils.ts");
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
    const DEFAULT_COMPANION = _schema_characters__WEBPACK_IMPORTED_MODULE_1__.CompanionSchema.parse({});
    const CJK_TEXT_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
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
        上次结果: preferNonDefaultString(incoming.修炼状态?.上次结果, String(base.修炼状态?.上次结果 ?? fallbackCultivationState.上次结果), fallbackCultivationState.上次结果)
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
        纪元: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("末法时代"),
        年份: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
        月份: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 12)).prefault(1),
        日期: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 30)).prefault(1),
        时辰: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("子时")
      }).prefault({
        纪元: "末法时代",
        年份: 1,
        月份: 1,
        日期: 1,
        时辰: "子时"
      }),
      世界地图: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("区域名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        layer: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "天层", "地层", "下层" ]).prefault("地层"),
        danger: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)),
        desc: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
        connections: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([])
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
      可参与机遇: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(_schema_systems__WEBPACK_IMPORTED_MODULE_4__.OpportunitySchema).prefault([]).transform(list => list.filter(item => !!item.名称)),
      当前处境: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      _系统设置: _schema_systems__WEBPACK_IMPORTED_MODULE_4__.SystemSettingsSchema,
      _好感度快照: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("红颜名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, -200, 200))).prefault({})
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
  "./src/踏月寻仙-测试版/schema/characters.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
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
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/踏月寻仙-测试版/schema/common.ts");
    const CustomPortraitSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正面: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      背面: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const CharacterLibEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 48)),
      根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("灵根"),
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("体质"),
      龄: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("年龄"),
      属: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("所属"),
      法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("功法"),
      器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("本命兵器"),
      通: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([]),
      自定义立绘: CustomPortraitSchema
    });
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
      等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 48)).prefault(1),
      修为: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
      灵根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("五行杂灵根"),
      体质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡体"),
      功法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      本命兵器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      神通列表: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("神通名"), _common__WEBPACK_IMPORTED_MODULE_1__.SkillSchema).prefault({}),
      灵石: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
      已活岁月: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
      尝试突破: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      修炼状态: _common__WEBPACK_IMPORTED_MODULE_1__.CultivationStateSchema,
      好感度: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, -200, 200)).prefault(0),
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
        上次结果: "无"
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
      等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 48)).prefault(1),
      所在宗门: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("散修"),
      备注: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    });
  },
  "./src/踏月寻仙-测试版/schema/common.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CultivationStateSchema: () => CultivationStateSchema,
      InventorySchema: () => InventorySchema,
      ItemSchema: () => ItemSchema,
      SkillSchema: () => SkillSchema,
      computeRealmInfo: () => computeRealmInfo,
      describeRealmByLevel: () => describeRealmByLevel,
      extractSpiritStoneFromInventory: () => extractSpiritStoneFromInventory,
      getCultivationStatusLabel: () => getCultivationStatusLabel,
      getRealmThreshold: () => getRealmThreshold,
      isSpiritStoneCurrencyItem: () => isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => migrateLegacyCultivationProgress,
      normalizeCultivationState: () => normalizeCultivationState,
      normalizeSpiritStoneState: () => normalizeSpiritStoneState,
      品阶映射: () => 品阶映射,
      熟练度映射: () => 熟练度映射
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./src/踏月寻仙-测试版/schema/constants.ts");
    var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ "./src/踏月寻仙-测试版/schema/utils.ts");
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
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      品阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      数量: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(1)
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
    const CultivationStateSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶段: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 修炼阶段映射[String(v).trim()] || "修炼中").prefault("修炼中"),
      瓶颈原因: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      突破目标: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      上次结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 突破结果映射[String(v).trim()] || "无").prefault("无")
    }).prefault({
      阶段: "修炼中",
      瓶颈原因: "",
      突破目标: "",
      上次结果: "无"
    });
    function describeRealmByLevel(level) {
      const normalizedLevel = _.clamp(Math.floor(Number(level) || 1), 1, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length);
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
      const threshold = getRealmThreshold(options.level);
      let phase = parsedState.阶段;
      if (options.legacyAttemptBreakthrough || phase === "突破中") {
        phase = "突破中";
      } else if (phase === "修炼中" && options.cultivation >= threshold) {
        phase = "瓶颈中";
      }
      const nextRealmTarget = options.level < _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length ? describeRealmByLevel(options.level + 1) : parsedState.突破目标;
      const shouldHaveBreakthroughTarget = [ "瓶颈中", "突破中", "压境中" ].includes(phase);
      return {
        阶段: phase,
        瓶颈原因: shouldHaveBreakthroughTarget ? parsedState.瓶颈原因 : "",
        突破目标: shouldHaveBreakthroughTarget ? parsedState.突破目标 || nextRealmTarget : "",
        上次结果: parsedState.上次结果
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
    const SkillSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "功法", "神通", "秘术" ]).prefault("神通"),
      品阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 品阶映射[v] || "凡").catch("凡"),
      熟练度: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => normalizeSkillProficiency(v)).catch("入门"),
      领悟时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().catch(() => Date.now()),
      威力等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().optional()
    }).transform(skill => {
      if (!skill.威力等级 || skill.威力等级 === 0) {
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
      }
      return skill;
    });
    const InventorySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("物品名"), ItemSchema).prefault({}).transform(data => _.pickBy(data, ({数量}) => 数量 > 0));
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
  "./src/踏月寻仙-测试版/schema/constants.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
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
  "./src/踏月寻仙-测试版/schema/protagonist.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ProtagonistSchema: () => ProtagonistSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/踏月寻仙-测试版/schema/common.ts");
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
      灵力值: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(100),
      伤势等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 伤势映射[v] || "无伤").prefault("无伤"),
      已用底牌: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([]),
      战斗回合: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(0)
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
      当前阶段: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 9)).prefault(0),
      总阶段数: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 9)).prefault(0),
      劫力承受: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(100),
      已用护道: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([]),
      劫难描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      触发原因: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      上次渡劫结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 渡劫结果映射[v] || "无").prefault("无"),
      渡劫冷却: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
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
      危险度: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(10),
      可用通道: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([]),
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
      等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 48)).prefault(1),
      修为: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
      灵根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("五行杂灵根"),
      体质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡体"),
      功法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      本命兵器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      神通列表: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("神通名"), _common__WEBPACK_IMPORTED_MODULE_1__.SkillSchema).prefault({}),
      灵石: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
      已活岁月: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => Math.max(0, v)).prefault(0),
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
        上次结果: "无"
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
  "./src/踏月寻仙-测试版/schema/systems.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ActionSystemSettingsSchema: () => ActionSystemSettingsSchema,
      DifficultySystemSchema: () => DifficultySystemSchema,
      OpportunitySchema: () => OpportunitySchema,
      QuestSchema: () => QuestSchema,
      ReputationEntrySchema: () => ReputationEntrySchema,
      ReputationSystemSchema: () => ReputationSystemSchema,
      SystemSettingsSchema: () => SystemSettingsSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
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
        危: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)).optional(),
        特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
        奖: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v ? [ v ] : []) ]).prefault([]),
        限: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional()
      }).optional(),
      创建时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number(), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(() => Date.now()) ]).prefault(() => Date.now())
    });
    const ReputationEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      值: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, -100, 100)).prefault(0),
      关系: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("陌生"),
      更新时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(() => Date.now())
    });
    const ReputationSystemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("势力名"), ReputationEntrySchema).prefault({}).transform(factions => _(factions).mapValues(faction => {
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
      const 最终关系 = faction.关系 && faction.关系 !== "陌生" ? faction.关系 : 自动关系;
      return {
        ...faction,
        关系: 最终关系
      };
    }).value());
    const 机遇类型映射 = {
      探索: "探索",
      任务: "任务",
      交易: "交易",
      结交: "结交",
      争夺: "争夺",
      修炼: "修炼",
      红颜: "红颜",
      随机: "随机",
      行动: "探索",
      冒险: "探索",
      日常: "任务",
      日常互动: "红颜",
      战斗: "争夺",
      挑战: "争夺",
      社交: "结交",
      互动: "结交",
      邀约: "结交",
      邂逅: "结交",
      机缘: "探索",
      机遇: "探索",
      奇遇: "探索",
      秘境: "探索",
      寻宝: "探索",
      采购: "交易",
      易物: "交易",
      买卖: "交易",
      委托: "任务",
      悬赏: "任务",
      临危受命: "任务",
      支线: "任务",
      主线: "任务",
      双修: "红颜",
      亲密: "红颜",
      调情: "红颜",
      random: "随机"
    };
    const 机遇类型推断规则 = [ {
      type: "红颜",
      pattern: /红颜|佳人|道侣|双修|温情|独处|相拥|相守|调情|缠绵|共寝|同眠|忘忧|听雨|清弦|晚棠|云裳|梦杳泠|朔璃鸢|阿鸢|血手飞鸢|朔望舒|赤月女帝|幽影宗主|虞汐|虞颜|虞汐颜/
    }, {
      type: "修炼",
      pattern: /修炼|闭关|打坐|吐纳|冲关|破境|突破|压境|稳固|悟道|渡劫|根基|丹药|灵阵|参悟/
    }, {
      type: "交易",
      pattern: /坊市|易物|交易|买卖|采购|拍卖|丹药铺|商会|补给|售卖|收购|置换/
    }, {
      type: "争夺",
      pattern: /争夺|夺取|抢夺|截杀|斗法|厮杀|围攻|追杀|迎战|强敌|魔修|冲突|守擂|比斗/
    }, {
      type: "任务",
      pattern: /任务|委托|悬赏|求援|护送|调查|追查|营救|临危|急报|收尾|善后|赴约|赴命/
    }, {
      type: "结交",
      pattern: /结交|拜访|邀约|会面|结识|拉拢|试探|求见|访友|赴宴|论道|同游/
    }, {
      type: "随机",
      pattern: /随缘|随机|碰运气|听天由命/
    } ];
    function normalizeOpportunityText(value) {
      return String(value ?? "").trim();
    }
    function inferOpportunityType(rawType, payload) {
      const mappedType = 机遇类型映射[rawType];
      if (mappedType) {
        return mappedType;
      }
      const text = Object.values(payload).map(value => normalizeOpportunityText(value)).filter(Boolean).join("｜");
      for (const rule of 机遇类型推断规则) {
        if (rule.pattern.test(text)) {
          return rule.type;
        }
      }
      return "探索";
    }
    const OpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      来源: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault("探索"),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      回报预期: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      风险评估: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      时限: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).optional(),
      关联事件: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).optional(),
      优先级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 1, 5)).prefault(3)
    }).transform(item => {
      const payload = {
        名称: item.名称,
        来源: item.来源,
        描述: item.描述,
        回报预期: item.回报预期,
        风险评估: item.风险评估,
        时限: item.时限 ?? "",
        关联事件: item.关联事件 ?? ""
      };
      return {
        ...item,
        类型: inferOpportunityType(item.类型, payload)
      };
    });
    const SystemSettingsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      启用行动提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(true),
      修炼系统版本: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
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
        版本号: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
        平衡保护: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          连续受挫计数: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(0),
          触发阈值: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(3),
          生效剩余回合: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(0),
          冷却剩余回合: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(0)
        }).prefault({}),
        动态策略: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          单回合改变量上限: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(.15),
          自然回落速度: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(.03),
          增长冷却回合: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(2)
        }).prefault({}),
        难度结算快照: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          回合基线系数: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
          本回合最终系数: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
          分层来源: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
            世界叙事层: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
            玩家偏好层: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1),
            短期状态层: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().prefault(1)
          }).prefault({})
        }).prefault({})
      }).prefault({})
    }).prefault({});
  },
  "./src/踏月寻仙-测试版/schema/utils.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      calculateBaseCombatPower: () => calculateBaseCombatPower,
      evaluateCombatPower: () => evaluateCombatPower,
      getDangerColor: () => getDangerColor,
      getRealmColor: () => getRealmColor,
      getRootColor: () => getRootColor,
      parseRealmToLevel: () => parseRealmToLevel
    });
    var _constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants */ "./src/踏月寻仙-测试版/schema/constants.ts");
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
  "./src/踏月寻仙-测试版/schema/world.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
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
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/踏月寻仙-测试版/schema/common.ts");
    const FactionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      地: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("所在地"),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("核心特点"),
      力: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("最高战力"),
      营: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "正", "魔", "中" ]),
      模: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "超大", "大", "小", "微", "特" ])
    });
    const TechniqueSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => _common__WEBPACK_IMPORTED_MODULE_1__["品阶映射"][v] || "凡").catch("凡"),
      性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("属性"),
      效: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("效果")
    });
    const TreasureSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "凡器", "法器", "灵器", "法宝", "灵宝", "仙器", "圣器", "道器", "本命" ]),
      类: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("类型"),
      本命特性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional().describe("本命法宝独有特性"),
      器灵: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional().describe("器灵名称")
    }).transform(data => ({
      ...data,
      特: data.阶 === "本命" ? "至尊" : data.阶 === "道器" ? "超凡" : data.阶 === "圣器" ? "极品" : data.阶 === "仙器" ? "顶级" : data.阶 === "灵宝" ? "强" : data.阶 === "法宝" ? "中" : "普通"
    }));
    const LocationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      域: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "天层", "神州", "东苍", "南炎", "西庚", "北冥", "下层", "四海" ]),
      类: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "秘境", "城镇", "宗门", "禁地", "遗迹", "地形" ]),
      危: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("特点"),
      资: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v ? [ v ] : []) ]).prefault([])
    });
    const SpiritRootSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "劣", "下", "中", "上", "极", "天", "异" ]),
      性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("属性"),
      稀: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "常", "少", "罕", "稀", "传" ])
    }).transform(data => {
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
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "凡", "灵", "道", "圣", "神" ]),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("特性"),
      稀: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "常", "少", "罕", "稀", "传" ])
    }).transform(data => ({
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
  var _schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../踏月寻仙-测试版/schema */ "./src/踏月寻仙-测试版/schema.ts");
  $(() => {
    (0, https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__.registerMvuSchema)(_schema__WEBPACK_IMPORTED_MODULE_1__.Schema);
    console.info("[灯火阑珊·旧梦新裁] MVU 变量结构已注册");
    toastr.success("MVU 变量结构已成功注册", "灯火阑珊·旧梦新裁");
  });
})();