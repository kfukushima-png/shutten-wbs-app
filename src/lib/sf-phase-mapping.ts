// Salesforce フェーズ → WBS フェーズの対応表
// Salesforce側のフェーズ値をキーに、WBSアプリ内のフェーズ名を値にする

export interface PhaseMapping {
  sfPhaseCode: string;
  sfPhaseName: string;
  wbsPhase: string;
  isBaseDate: boolean; // このフェーズで基準日を設定するか
  description: string;
}

export const PHASE_MAPPINGS: PhaseMapping[] = [
  {
    sfPhaseCode: "00",
    sfPhaseName: "出店停止",
    wbsPhase: "__STOP__",
    isBaseDate: false,
    description: "全タスクを一時停止",
  },
  {
    sfPhaseCode: "01",
    sfPhaseName: "不動産探し中",
    wbsPhase: "不動産探し",
    isBaseDate: false,
    description: "物件探しフェーズのタスクを開始",
  },
  {
    sfPhaseCode: "02",
    sfPhaseName: "物件内見中",
    wbsPhase: "物件内見",
    isBaseDate: false,
    description: "内見・比較タスクを開始",
  },
  {
    sfPhaseCode: "03",
    sfPhaseName: "不動産審査中",
    wbsPhase: "不動産審査",
    isBaseDate: false,
    description: "審査関連タスクを開始",
  },
  {
    sfPhaseCode: "04",
    sfPhaseName: "現場調査",
    wbsPhase: "現場調査",
    isBaseDate: false,
    description: "現場調査タスクを開始",
  },
  {
    sfPhaseCode: "05",
    sfPhaseName: "不動産契約",
    wbsPhase: "不動産契約",
    isBaseDate: true, // ★ 基準日をこのタイミングで設定
    description: "契約手続きタスクを開始（基準日設定）",
  },
  {
    sfPhaseCode: "06",
    sfPhaseName: "内装検討中",
    wbsPhase: "内装検討",
    isBaseDate: false,
    description: "内装関連タスクを開始",
  },
  {
    sfPhaseCode: "07",
    sfPhaseName: "施工実施中",
    wbsPhase: "施工実施",
    isBaseDate: false,
    description: "施工管理タスクを開始",
  },
  {
    sfPhaseCode: "08",
    sfPhaseName: "備品設置中",
    wbsPhase: "備品設置",
    isBaseDate: false,
    description: "備品・オープン準備タスクを開始",
  },
  {
    sfPhaseCode: "09",
    sfPhaseName: "出店完了",
    wbsPhase: "出店完了",
    isBaseDate: false,
    description: "完了処理タスクを開始",
  },
];

export function getMappingByCode(code: string): PhaseMapping | undefined {
  return PHASE_MAPPINGS.find((m) => m.sfPhaseCode === code);
}

export function getMappingByName(name: string): PhaseMapping | undefined {
  // "01：不動産探し中" のような形式にも対応
  const cleaned = name.replace(/^\d+[\s:：]+/, "").trim();
  return PHASE_MAPPINGS.find(
    (m) => m.sfPhaseName === name || m.sfPhaseName === cleaned || name.includes(m.sfPhaseName)
  );
}
