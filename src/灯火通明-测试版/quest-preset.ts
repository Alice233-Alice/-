export interface QuestPresetData {
  名称: string;
  类型: '主线' | '支线' | '每日' | '临危受命' | '秘境探索';
  目标: string;
  进度: string;
  下一步: string;
  状态: '进行中';
  创建时间: number;
}

type QuestPresetInput = Partial<Omit<QuestPresetData, '类型' | '状态'>> & { 类型?: string; 状态?: string };

/** 预设读取、导入和保存共用字段转换，避免往返编辑时丢失任务进展。 */
export function copyQuestForPreset(task: QuestPresetInput): QuestPresetData {
  return {
    名称: task.名称 || '',
    类型: (task.类型 as QuestPresetData['类型']) || '支线',
    目标: task.目标 || '',
    进度: task.进度 || '',
    下一步: task.下一步 || '',
    状态: '进行中',
    创建时间: task.创建时间 ?? Date.now(),
  };
}
