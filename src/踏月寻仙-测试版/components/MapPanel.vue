<template>
  <div class="panel map-panel">
    <div class="current-location">
      <div class="location-name">{{ store.本尊.行踪.当前区域 }}</div>
      <div class="location-layer">{{ displayLayer }}</div>
      <div class="location-desc">{{ store.本尊.行踪.环境描述 }}</div>
    </div>
    <div class="connections">
      <div class="connections-title">可通往：</div>
      <div class="connections-list">
        <span
          v-for="conn in availableConnections"
          :key="conn"
          class="connection-item"
          :style="{ borderColor: getRegionColor(conn) }"
        >
          {{ conn }}
        </span>
        <div v-if="availableConnections.length === 0" class="empty-hint" style="padding: 10px">尚未探明通道</div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <div class="section-title">
        <i class="fa-solid fa-scroll"></i> 任务
      </div>
      <div class="tasks-list">
        <template v-for="(task, taskId) in store.任务列表" :key="taskId">
          <div v-if="taskId && String(taskId).trim()" class="task-item" :class="`task-${task.状态}`">
            <div class="task-header">
              <span class="task-name">{{ getTaskDisplayName(task, String(taskId)) }}</span>
              <span class="task-type" :class="`type-${task.类型}`">{{ task.类型 }}</span>
            </div>
            <div class="task-target">{{ task.目标 }}</div>
            <div class="task-status">{{ task.状态 }}</div>
          </div>
        </template>
        <div v-if="!store.任务列表 || Object.keys(store.任务列表).length === 0" class="empty-hint">暂无任务</div>
      </div>
    </div>

    <!-- 声望系统 -->
    <div class="reputation-section">
      <div class="section-title">
        <i class="fa-solid fa-star"></i> 声望
      </div>
      <div class="reputation-list">
        <template v-for="(rep, faction) in store.声望系统" :key="faction">
          <div v-if="faction && String(faction).trim()" class="reputation-item">
            <div class="reputation-faction">{{ faction }}</div>
            <div class="reputation-bar">
              <div
                class="reputation-fill"
                :style="{
                  width: `${Math.abs(rep.值)}%`,
                  backgroundColor: rep.值 >= 0 ? '#44aa44' : '#ff4444',
                }"
              ></div>
            </div>
            <div class="reputation-info">
              <span class="reputation-value">{{ rep.值 }}</span>
              <span class="reputation-relation">{{ rep.关系 }}</span>
            </div>
          </div>
        </template>
        <div v-if="!store.声望系统 || Object.keys(store.声望系统).length === 0" class="empty-hint">暂无声望记录</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDangerColor } from '../schema';
import { inferLayerFromTrack, normalizeRegionName } from '../region-utils';
import { useDataStore } from '../store';

const store = useDataStore();

// 智能提取任务显示名称
// AI 有时用 "MQ"、"SQ_炼器入门" 等 ID 格式作为 key 但不填名称字段
// 此函数从 taskId 中提取中文部分作为显示名，避免直接暴露英文 ID
const extractChineseQuestLabel = (input: unknown): string => {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  const strippedPrefix = raw.replace(/^(?:[A-Za-z][A-Za-z0-9]*)(?:[._:\-/\\\s]+[A-Za-z0-9]+)*[._:\-/\\\s]*/u, '').trim();
  const candidate = strippedPrefix || raw;
  const firstCjkIndex = candidate.search(/[\u3400-\u4dbf\u4e00-\u9fff]/);
  if (firstCjkIndex < 0) return '';
  return candidate.slice(firstCjkIndex).trim();
};

const getTaskDisplayName = (task: { 名称: string; 类型: string }, taskId: string): string => {
  const normalizedName = extractChineseQuestLabel(task.名称);
  if (normalizedName) return normalizedName;

  const normalizedTaskId = extractChineseQuestLabel(taskId);
  if (normalizedTaskId) return normalizedTaskId;

  // 纯英文 ID 按类型给默认名
  const typeNames: Record<string, string> = {
    主线: '主线任务',
    支线: '支线任务',
    每日: '每日任务',
    临危受命: '紧急任务',
    秘境探索: '秘境任务',
  };
  return typeNames[task.类型] || '未命名任务';
};

const displayLayer = computed(() => inferLayerFromTrack(
  store.本尊.行踪.当前区域,
  store.本尊.行踪.所属层级,
  store.本尊.行踪.环境描述,
  store.地点库 as Record<string, { 域?: string }>,
  store.世界地图 as Record<string, { layer?: string }>,
));

// 计算可通往的地点
const availableConnections = computed(() => {
  const manualConnections = store.本尊.行踪.可用通道;
  if (manualConnections && manualConnections.length > 0) {
    return manualConnections;
  }

  const currentRegionRaw = store.本尊.行踪.当前区域;
  const currentRegion = normalizeRegionName(currentRegionRaw);
  if (!currentRegion || !store.世界地图) {
    return [];
  }

  const mapData = store.世界地图[currentRegion] ?? store.世界地图[currentRegionRaw];
  return mapData?.connections || [];
});

// 获取区域颜色
const getRegionColor = (region: string) => {
  const map = store.世界地图;
  const info = map[region];
  if (!info) return '#888888';
  return getDangerColor(info.danger);
};
</script>

<style lang="scss" scoped>
.map-panel {
  padding: 16px;

  .current-location {
    text-align: center;
    padding: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    margin-bottom: 16px;

    .location-name {
      font-size: 22px;
      font-weight: bold;
      color: #a0d0ff;
      margin-bottom: 4px;
    }

    .location-layer {
      font-size: 12px;
      color: var(--accent-color);
      margin-bottom: 10px;
    }

    .location-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }

  .connections {
    margin-bottom: 20px;

    .connections-title {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }

    .connections-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .connection-item {
        padding: 6px 12px;
        background: var(--bg-secondary);
        border: 1px solid;
        border-radius: 15px;
        font-size: 12px;
        color: var(--text-accent);
      }
    }
  }

  // 任务列表
  .tasks-section {
    margin-bottom: 20px;

    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: var(--text-accent);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;

      i {
        color: var(--accent-color);
      }
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .task-item {
      padding: 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      border-left: 3px solid;

      &.task-进行中 {
        border-left-color: #4a9eff;
      }

      &.task-已完成 {
        border-left-color: #44aa44;
        opacity: 0.7;
      }

      &.task-已失败 {
        border-left-color: #ff4444;
        opacity: 0.7;
      }

      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .task-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .task-type {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;

          &.type-主线 {
            background: rgba(255, 100, 100, 0.2);
            color: #ff6464;
          }

          &.type-支线 {
            background: rgba(100, 150, 255, 0.2);
            color: #6496ff;
          }

          &.type-每日 {
            background: rgba(100, 200, 100, 0.2);
            color: #64c864;
          }

          &.type-临危受命 {
            background: rgba(255, 150, 50, 0.2);
            color: #ff9632;
          }
        }
      }

      .task-target {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 4px;
        line-height: 1.4;
      }

      .task-status {
        font-size: 11px;
        color: var(--text-accent);
      }
    }
  }

  // 声望系统
  .reputation-section {
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: var(--text-accent);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;

      i {
        color: var(--accent-color);
      }
    }

    .reputation-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .reputation-item {
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;

      .reputation-faction {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 6px;
      }

      .reputation-bar {
        height: 6px;
        background: var(--progress-bg);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 6px;

        .reputation-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
      }

      .reputation-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;

        .reputation-value {
          color: var(--text-accent);
        }

        .reputation-relation {
          color: var(--text-secondary);
        }
      }
    }
  }

  .empty-hint {
    text-align: center;
    padding: 20px;
    color: #506070;
    font-style: italic;
  }
}

// 手机端适配
@media screen and (max-width: 480px) {
  .map-panel {
    padding: 12px;

    .current-location {
      padding: 16px;

      .location-name {
        font-size: 18px;
      }

      .location-layer {
        font-size: 11px;
      }

      .location-desc {
        font-size: 12px;
      }
    }

    .connections {
      .connections-title {
        font-size: 12px;
      }

      .connections-list {
        gap: 6px;

        .connection-item {
          padding: 5px 10px;
          font-size: 11px;
        }
      }
    }

    .tasks-section {
      .section-title {
        font-size: 13px;
      }

      .task-item {
        padding: 10px;

        .task-name {
          font-size: 12px;
        }

        .task-type {
          font-size: 9px;
          padding: 2px 6px;
        }

        .task-target {
          font-size: 11px;
        }

        .task-status {
          font-size: 10px;
        }
      }
    }

    .reputation-section {
      .section-title {
        font-size: 13px;
      }

      .reputation-item {
        padding: 8px 10px;

        .reputation-faction {
          font-size: 12px;
        }

        .reputation-bar {
          height: 5px;
        }

        .reputation-info {
          font-size: 10px;
        }
      }
    }
  }
}
</style>
