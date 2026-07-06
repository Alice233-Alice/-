// ============================================================================// 角色图片资源配置 (Character Assets Configuration)
// 在这里配置所有角色的图片资源（正面和背面）
// ============================================================================

/**
 * 单个表情的图片配置
 */
export interface ExpressionImages {
    /** 正面图片 URL */
    front: string;
    /** 背面图片 URL（可选，如果不填则使用正面图片） */
    back?: string;
}

/**
 * 角色图片资源配置
 * 格式: { 角色名: { 表情代号: { front: 正面URL, back: 背面URL } } }
 *
 * 使用方法:
 * 1. 为每个角色创建一个对象
 * 2. 为每个表情/状态配置对应的正面和背面图片URL
 * 3. AI 输出时会根据 img_code 自动匹配对应的图片
 * 4. 如果不需要不同的背面图片，可以只填写 front，或使用简写形式
 */
export const CHARACTER_ASSETS: Record<string, Record<string, ExpressionImages | string>> = {
    // ============================================================================
    // 示例角色：孟十七
    // ============================================================================
    孟十七: {
        // 完整配置示例（有不同的正面和背面）
        normal: {
            front: 'https://files.catbox.moe/c1su29.jpg', // 日常/平静 - 正面
            back: 'https://files.catbox.moe/c1su29.jpg', // 日常/平静 - 背面（可以是不同的图片）
        },
        // 简写形式（正面和背面使用相同图片）
        shy: 'https://files.catbox.moe/8doe0f.jpg', // 害羞/脸红
        smile: 'https://files.catbox.moe/8doe0f.jpg', // 微笑/开心
        angry: 'https://files.catbox.moe/c1su29.jpg', // 生气/鼓嘴
        cry: 'https://files.catbox.moe/c1su29.jpg', // 哭泣/委屈
        surprise: 'https://files.catbox.moe/8doe0f.jpg', // 惊讶/瞪眼
    },

    // ============================================================================
    // 白清弦 - 剑道宗师
    // ============================================================================
    白清弦: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 虞汐颜 - 一体双魂（虞汐白头发/虞颜黑头发）
    // ============================================================================
    虞汐颜: {
        // 随机选择正面和背面图片
        // 特殊逻辑：正面虞汐时背面虞颜，正面虞颜时背面虞汐
        normal: {
            front: 'random_dual_front', // 特殊标记，随机选择虞汐或虞颜的正面
            back: 'random_dual_back',   // 特殊标记，自动选择另一个魂体的背面
        },
    },

    // ============================================================================
    // 许听雨
    // ============================================================================
    许听雨: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 南宫云裳
    // ============================================================================
    南宫云裳: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 朔璃鸢
    // ============================================================================
    朔璃鸢: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 晚棠 - 黄泉摆渡人
    // ============================================================================
    晚棠: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 梦杳泠
    // ============================================================================
    梦杳泠: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 安迟迟
    // ============================================================================
    安迟迟: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 阮忘忧
    // ============================================================================
    阮忘忧: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 朔望舒
    // ============================================================================
    朔望舒: {
        // 随机选择正面和背面图片
        normal: {
            front: 'random_front', // 特殊标记，表示从正面图片池中随机选择
            back: 'random_back',   // 特殊标记，表示从背面图片池中随机选择
        },
    },

    // ============================================================================
    // 添加更多角色示例
    // ============================================================================
    // 角色名2: {
    //   // 完整配置（不同的正面和背面）
    //   normal: {
    //     front: '正面图片URL',
    //     back: '背面图片URL',
    //   },
    //   // 简写配置（正面和背面相同）
    //   happy: '图片URL',
    //   sad: '图片URL',
    //   // ... 更多表情
    // },
};

/**
 * 角色名称别名映射
 * AI 按照世界书规则会分别输出 "虞汐" 和 "虞颜"，需要映射到 "虞汐颜" 的资源配置
 */
const CHARACTER_NAME_ALIASES: Record<string, string> = {
    '虞汐': '虞汐颜',
    '虞颜': '虞汐颜',
    '阿鸢': '朔璃鸢',
    '血手飞鸢': '朔璃鸢',
    '念迟迟': '安迟迟',
    '蘅之': '安迟迟',
    '拈韵居士': '安迟迟',
    '掌籍师姐': '安迟迟',
};

/**
 * 解析角色名称（支持别名映射）
 * @param name AI 输出的角色名
 * @returns 标准化后的资源配置名
 */
function resolveCharacterName(name: string): string {
    return CHARACTER_NAME_ALIASES[name] ?? name;
}

/**
 * 从原始角色名推断虞汐颜的优先魂体
 * @param originalName AI 输出的原始角色名
 * @returns 优先显示在正面的魂体，或 undefined 表示随机
 */
function inferPreferredSoul(originalName: string): '虞汐' | '虞颜' | undefined {
    if (originalName === '虞汐') return '虞汐';
    if (originalName === '虞颜') return '虞颜';
    return undefined;
}

/**
 * 角色图片池 - 用于随机选择
 * 格式: { 角色名: { front: [正面图片URL列表], back: [背面图片URL列表] } }
 */
export const CHARACTER_IMAGE_POOLS: Record<string, { front: string[]; back: string[] }> = {
    白清弦: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦1.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦2.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦3.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦4.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦5.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦18.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦19.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦20.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦21.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦22.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦38.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦36.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦31.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (84).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (123).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (121).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (116).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (118).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (139).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (138).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (134).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (133).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (136).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (130).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦6.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦7.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦8.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦9.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦10.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦11.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦15.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦16.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦17.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦25.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦24.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦23.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦15.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦26.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦27.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦28.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦29.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦30.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦37.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (142).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (141).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (140).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (137).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (135).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (129).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (131).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (132).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (128).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (127).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (125).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (122).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (117).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/白清弦 (111).png',
        ],
    },
    许听雨: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (111).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (116).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (125).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (128).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (129).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (133).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (132).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (131).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (136).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (137).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (138).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (140).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (139).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (141).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (118).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (117).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (121).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (122).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (123).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (124).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (130).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (126).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (127).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (134).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (135).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (142).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (144).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/许听雨 (143).png',
        ],
    },
    虞汐颜: {
        // 虞汐的图片（白头发）
        虞汐_front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (84).png',
        ],
        虞汐_back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞汐 (99).png',
        ],
        // 虞颜的图片（黑头发）
        虞颜_front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (84).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (111).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (117).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (118).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (123).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (122).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (121).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (125).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (126).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (127).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (128).png',
        ],
        虞颜_back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (116).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (124).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/虞颜 (129).png',
        ],
    } as any,
    南宫云裳: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (111).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (118).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (106).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (84).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/南宫云裳 (116).png',
        ],
    },
    朔璃鸢: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (84).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (135).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (134).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (136).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (133).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (132).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (131).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (130).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (129).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (126).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (125).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (122).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (118).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (117).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (116).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (111).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (101).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (121).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (124).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (123).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (127).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (128).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (137).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔璃鸢 (91).png',
        ],
    },
    晚棠: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (84).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (138).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (137).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (111).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (133).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (135).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (127).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (129).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (123).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (124).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (122).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (136).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (118).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (116).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (139).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (134).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (132).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (131).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (130).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (117).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (126).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/晚棠 (128).png',
        ],
    },
    梦杳泠: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (91).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/梦杳泠 (84).png',
        ],
    },
    安迟迟: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (2).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/00-12-43-65631017743035_部位细化_00001_.png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/安迟迟 (78).png',
        ],
    },
    阮忘忧: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (84).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (103).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (121).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (115).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (111).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (5).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (77).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (70).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (39).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (35).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (13).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (92).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (122).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (120).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (119).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (116).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (117).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/阮忘忧 (118).png',
        ],
    },
    朔望舒: {
        front: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (7).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (9).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (15).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (18).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (20).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (23).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (21).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (25).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (27).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (30).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (29).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (36).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (40).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (38).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (41).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (43).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (44).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (47).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (46).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (45).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (48).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (52).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (51).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (50).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (49).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (53).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (54).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (55).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (56).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (60).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (59).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (58).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (57).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (61).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (62).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (63).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (1).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (2).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (3).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (67).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (66).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (71).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (72).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (73).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (76).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (83).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (82).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (114).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (112).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (111).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (104).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (106).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (99).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (101).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (102).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (97).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (89).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (88).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (84).png',
        ],
        back: [
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (81).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (80).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (78).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (79).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (75).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (74).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (69).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (68).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (4).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (65).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (64).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (42).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (37).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (33).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (34).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (31).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (32).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (26).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (28).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (24).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (22).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (19).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (17).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (14).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (16).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (12).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (11).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (10).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (8).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (6).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (95).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (113).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (107).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (108).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (109).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (110).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (100).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (96).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (98).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (94).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (93).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (91).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (90).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (87).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (85).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (86).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (105).png',
            'https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/朔望舒 (103).png',
        ],
    },
};

/**
 * 默认表情 - 当 AI 输出的 img_code 不存在时使用
 */
export const DEFAULT_EXPRESSION = 'normal';

/**
 * 默认卡片背景 - 当角色没有配置图片时使用的占位图
 */
export const DEFAULT_PLACEHOLDER = 'https://files.catbox.moe/placeholder.jpg';

/**
 * 从图片池中随机选择一张图片
 * 虞汐颜专用：缓存当前选择的魂体，以便正面和背面使用不同的魂体
 */
let cachedDualSoul: '虞汐' | '虞颜' | null = null;

/**
 * 会话缓存：记录已经为虞汐颜生成过的卡片
 * 避免在同一个消息楼层中生成多张虞汐颜卡片
 */
let dualSoulSessionUsed = false;

/**
 * 抽取缓存：记录每个图片池当前轮次还没被抽过的图片
 * 当某个池被抽空时，自动重置并开始下一轮
 */
const imageDrawCache = new Map<string, string[]>();

function drawImageWithoutRepeat(poolKey: string, images: string[]): string {
    let remainingImages = imageDrawCache.get(poolKey);

    // 首次抽取或本轮已抽空时，重置为完整图池
    if (!remainingImages || remainingImages.length === 0) {
        remainingImages = [...images];
    }

    const randomIndex = Math.floor(Math.random() * remainingImages.length);
    const selectedImage = remainingImages[randomIndex];
    remainingImages.splice(randomIndex, 1);

    imageDrawCache.set(poolKey, remainingImages);
    return selectedImage;
}

function getRandomImage(characterName: string, type: 'front' | 'back'): string {
    const pool = CHARACTER_IMAGE_POOLS[characterName];
    if (!pool) {
        console.warn(`[图鉴] 未找到角色 "${characterName}" 的图片池`);
        return DEFAULT_PLACEHOLDER;
    }

    const images = pool[type];
    if (!images || images.length === 0) {
        console.warn(`[图鉴] 角色 "${characterName}" 的 ${type} 图片池为空`);
        return DEFAULT_PLACEHOLDER;
    }

    return drawImageWithoutRepeat(`${characterName}:${type}`, images);
}

/**
 * 虞汐颜专用：获取一体双魂的图片和名字
 * 正面虞汐时背面虞颜，正面虞颜时背面虞汐
 *
 * 重要：每次调用此函数时，只会生成一对卡片（正面+背面）
 * 如果已经生成过，则返回 null，避免重复生成
 */
function getDualSoulImage(type: 'front' | 'back', preferredSoul?: '虞汐' | '虞颜'): { url: string; soulName: string } | null {
    const pool = CHARACTER_IMAGE_POOLS['虞汐颜'] as any;
    if (!pool) {
        console.warn(`[图鉴] 未找到虞汐颜的图片池`);
        return { url: DEFAULT_PLACEHOLDER, soulName: '虞汐颜' };
    }

    if (type === 'front') {
        // 如果已经生成过虞汐颜卡片，返回 null
        if (dualSoulSessionUsed) {
            console.info(`[图鉴] 虞汐颜卡片已生成，跳过重复生成`);
            return null;
        }

        // 标记为已使用
        dualSoulSessionUsed = true;

        // 正面：优先使用指定的魂体，否则随机选择
        const soul = preferredSoul ?? (Math.random() < 0.5 ? '虞汐' : '虞颜');
        cachedDualSoul = soul;
        const images = pool[`${soul}_front`];
        if (!images || images.length === 0) {
            console.warn(`[图鉴] 虞汐颜的 ${soul} 正面图片池为空`);
            return { url: DEFAULT_PLACEHOLDER, soulName: soul };
        }
        console.info(`[图鉴] 虞汐颜正面选择: ${soul}`);
        return {
            url: drawImageWithoutRepeat(`虞汐颜:${soul}_front`, images),
            soulName: soul,
        };
    } else {
        // 背面：使用另一个魂体
        // 如果 cachedDualSoul 为 null，说明出现了异常调用顺序
        if (!cachedDualSoul) {
            console.error(`[图鉴] 错误：虞汐颜背面图片获取时，正面魂体未缓存`);
            return { url: DEFAULT_PLACEHOLDER, soulName: '虞汐颜' };
        }
        
        const soul = cachedDualSoul === '虞汐' ? '虞颜' : '虞汐';
        const images = pool[`${soul}_back`];
        if (!images || images.length === 0) {
            console.warn(`[图鉴] 虞汐颜的 ${soul} 背面图片池为空`);
            return { url: DEFAULT_PLACEHOLDER, soulName: soul };
        }
        console.info(`[图鉴] 虞汐颜背面选择: ${soul}`);
        return {
            url: drawImageWithoutRepeat(`虞汐颜:${soul}_back`, images),
            soulName: soul,
        };
    }
}

/**
 * 标准化表情配置（将简写形式转换为完整形式）
 * 对于虞汐颜，还会返回对应的魂体名字
 *
 * 如果虞汐颜已经生成过卡片，则返回 null
 */
function normalizeExpressionImages(config: ExpressionImages | string, characterName: string, originalName?: string): (ExpressionImages & { frontName?: string; backName?: string }) | null {
    if (typeof config === 'string') {
        return { front: config, back: config };
    }

    // 处理虞汐颜的特殊逻辑
    if (characterName === '虞汐颜') {
        if (config.front === 'random_dual_front') {
            const preferredSoul = inferPreferredSoul(originalName ?? characterName);
            const frontResult = getDualSoulImage('front', preferredSoul);

            // 如果返回 null，说明已经生成过了
            if (frontResult === null) {
                return null;
            }

            const backResult = getDualSoulImage('back');
            if (backResult === null) {
                return null;
            }

            return {
                front: frontResult.url,
                back: backResult.url,
                frontName: frontResult.soulName,
                backName: backResult.soulName
            };
        }
    }

    // 处理普通随机图片
    let front = config.front;
    let back = config.back ?? config.front;

    if (front === 'random_front') {
        front = getRandomImage(characterName, 'front');
    }
    if (back === 'random_back') {
        back = getRandomImage(characterName, 'back');
    }

    return { front, back };
}


/**
 * 获取角色正面图片URL
 * @param characterName 角色名
 * @param imgCode 表情代号
 * @returns 正面图片URL
 */
export function getCharacterImage(characterName: string, imgCode: string): string {
    const resolvedName = resolveCharacterName(characterName);
    const character = CHARACTER_ASSETS[resolvedName];
    if (!character) {
        console.warn(`[图鉴] 未找到角色 "${characterName}" 的图片配置，使用占位图`);
        return DEFAULT_PLACEHOLDER;
    }

    const config = character[imgCode] ?? character[DEFAULT_EXPRESSION];
    if (!config) {
        console.warn(`[图鉴] 角色 "${characterName}" 没有表情 "${imgCode}" 的图片，使用占位图`);
        return DEFAULT_PLACEHOLDER;
    }

    const normalized = normalizeExpressionImages(config, resolvedName, characterName);
    if (!normalized) {
        console.warn(`[图鉴] 角色 "${characterName}" 图片标准化失败，使用占位图`);
        return DEFAULT_PLACEHOLDER;
    }
    return normalized.front;
}

/**
 * 获取角色背面图片URL
 * @param characterName 角色名
 * @param imgCode 表情代号
 * @returns 背面图片URL
 */
export function getCharacterBackImage(characterName: string, imgCode: string): string {
    const resolvedName = resolveCharacterName(characterName);
    const character = CHARACTER_ASSETS[resolvedName];
    if (!character) {
        console.warn(`[图鉴] 未找到角色 "${characterName}" 的图片配置，使用占位图`);
        return DEFAULT_PLACEHOLDER;
    }

    const config = character[imgCode] ?? character[DEFAULT_EXPRESSION];
    if (!config) {
        console.warn(`[图鉴] 角色 "${characterName}" 没有表情 "${imgCode}" 的图片，使用占位图`);
        return DEFAULT_PLACEHOLDER;
    }

    const normalized = normalizeExpressionImages(config, resolvedName, characterName);
    if (!normalized || !normalized.back) {
        console.warn(`[图鉴] 角色 "${characterName}" 背面图片标准化失败，使用占位图`);
        return DEFAULT_PLACEHOLDER;
    }
    return normalized.back;
}

/**
 * 获取角色正面和背面图片URL
 * 对于虞汐颜，会返回对应的魂体名字
 *
 * 重要：每次页面加载时，虞汐颜只会生成一张卡片
 * @param characterName 角色名
 * @param imgCode 正面表情代号
 * @param backImgCode 背面表情代号（可选，默认与正面相同）
 * @returns { front: 正面URL, back: 背面URL, frontName?: 正面名字, backName?: 背面名字 } 或 null（如果虞汐颜已生成）
 */
export function getCharacterImages(
    characterName: string,
    imgCode: string,
    backImgCode?: string,
): { front: string; back: string; frontName?: string; backName?: string } | null {
    const resolvedName = resolveCharacterName(characterName);
    const character = CHARACTER_ASSETS[resolvedName];
    if (!character) {
        console.warn(`[图鉴] 未找到角色 "${characterName}" 的图片配置，使用占位图`);
        return { front: DEFAULT_PLACEHOLDER, back: DEFAULT_PLACEHOLDER };
    }

    const frontConfig = character[imgCode] ?? character[DEFAULT_EXPRESSION];
    if (!frontConfig) {
        console.warn(`[图鉴] 角色 "${characterName}" 没有表情 "${imgCode}" 的图片，使用占位图`);
        return { front: DEFAULT_PLACEHOLDER, back: DEFAULT_PLACEHOLDER };
    }

    const frontNormalized = normalizeExpressionImages(frontConfig, resolvedName, characterName);

    // 如果返回 null（虞汐颜已生成），则返回 null
    if (frontNormalized === null) {
        return null;
    }

    // 如果指定了 backImgCode，则单独获取背面图片
    let backUrl = frontNormalized.back;
    if (backImgCode && backImgCode !== imgCode) {
        const backConfig = character[backImgCode] ?? character[DEFAULT_EXPRESSION];
        if (backConfig) {
            const backNormalized = normalizeExpressionImages(backConfig, resolvedName, characterName);
            if (backNormalized && backNormalized.back) {
                backUrl = backNormalized.back;
            }
        } else {
            console.warn(`[图鉴] 角色 "${characterName}" 没有背面表情 "${backImgCode}"，使用正面背面`);
        }
    }

    if (!backUrl) {
        console.warn(`[图鉴] 角色 "${characterName}" 背面图片缺失，使用正面图片`);
        backUrl = frontNormalized.front;
    }

    return {
        front: frontNormalized.front,
        back: backUrl,
        frontName: frontNormalized.frontName,
        backName: frontNormalized.backName
    };
}

/**
 * 重置虞汐颜的会话缓存
 * 在新的消息楼层或页面重新加载时调用
 */
export function resetDualSoulSession() {
    dualSoulSessionUsed = false;
    cachedDualSoul = null;
    console.info('[图鉴] 虞汐颜会话缓存已重置');
}

/**
 * 获取角色所有可用的表情列表
 * @param characterName 角色名
 * @returns 表情代号列表
 */
export function getAvailableExpressions(characterName: string): string[] {
    const resolvedName = resolveCharacterName(characterName);
    const character = CHARACTER_ASSETS[resolvedName];
    return character ? Object.keys(character) : [];
}

/**
 * 检查角色是否已配置
 * @param characterName 角色名
 * @returns 是否已配置
 */
export function isCharacterConfigured(characterName: string): boolean {
    const resolvedName = resolveCharacterName(characterName);
    return resolvedName in CHARACTER_ASSETS;
}
