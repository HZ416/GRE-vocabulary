import { useCallback } from 'react'
import { useSettingsStore } from './features/settings/settingsStore'

const zh: Record<string, string> = {
  Dashboard: '概览', Study: '学习', Vocabulary: '词库', Difficult: '难词', Favorites: '收藏', Statistics: '统计', Settings: '设置',
  'Local-first learning': '本地优先学习', 'Primary navigation': '主导航',
  'Loading today’s plan…': '正在加载今日计划…', 'No dashboard data.': '暂无概览数据。',
  'Everything that needs your attention today.': '集中查看今天需要完成的内容。', 'First-time setup': '首次设置',
  'Build your local vocabulary': '建立你的本地词库', 'Your words and learning progress stay on this device. Start by importing a UTF-8 CSV file.': '单词和学习进度只保存在这台设备上。请先导入 UTF-8 格式的 CSV 文件。',
  'Prepare a CSV': '准备 CSV', 'Include the required {lemma} and {source} columns.': '请包含必填的 {lemma} 和 {source} 列。',
  'Import vocabulary': '导入词库', 'Existing words are merged safely instead of replacing your progress.': '已有单词会安全合并，不会覆盖学习进度。',
  'Start reviewing': '开始复习', 'Your first daily queue is created automatically.': '系统会自动建立第一个每日学习队列。',
  New: '新词', Due: '到期', Overdue: '逾期', Total: '总计', 'Start review': '开始复习', 'Vocabulary progress': '词库进度',
  '{introduced} of {total} words introduced': '已学习 {total} 个单词中的 {introduced} 个', '{count} learning': '{count} 个学习中', '{count} in review': '{count} 个复习中', '{count} mastered': '{count} 个已掌握',
  "Today's study summary": '今日学习概览',
  'Application preferences and local database diagnostics.': '应用偏好和本地数据库诊断。', 'Interface language': '界面语言', English: 'English', Chinese: '中文',
  'Study preferences': '学习偏好', 'New words per day': '每日新词数', 'Maximum reviews per day': '每日最大复习数', 'Answer content': '答案内容',
  'English definition': '英文释义', 'Chinese definition': '中文释义', 'IPA pronunciation': 'IPA 音标', 'Example sentences': '例句',
  'Settings saved locally.': '设置已保存在本地。', 'Save preferences': '保存偏好', 'Export and backup': '导出与备份',
  'Save portable copies of your vocabulary and progress, or preserve the complete local database.': '导出便携的词库与进度文件，或保存完整的本地数据库。',
  'Vocabulary CSV': '词库 CSV', 'Vocabulary JSON': '词库 JSON', 'Progress JSON': '进度 JSON', 'Full database backup': '完整数据库备份', 'Restore database backup': '恢复数据库备份',
  'Validating and restoring backup…': '正在验证并恢复备份…', 'Preparing file…': '正在准备文件…', 'Saved to {path}': '已保存至 {path}',
  'Restored {words} words and {reviews} reviews. Reloading… Safety copy: {path}': '已恢复 {words} 个单词和 {reviews} 条复习记录，正在重新加载… 安全副本：{path}',
  'A database backup contains vocabulary, notes, settings, favorites, and complete review history. Restore validates the file before replacing any data.': '数据库备份包含词库、笔记、设置、收藏和完整复习记录。恢复前会先验证文件，再替换数据。',
  'Database health': '数据库状态', 'Not checked': '尚未检查', 'Checking local database…': '正在检查本地数据库…', 'Healthy · SQLite {version}': '正常 · SQLite {version}', 'Unavailable · {error}': '不可用 · {error}', 'Run health check': '运行状态检查',
  'Calculating statistics…': '正在计算统计数据…', 'No statistics available.': '暂无统计数据。', 'A concise view of your learning activity.': '简要查看你的学习情况。',
  'Words introduced': '已学习单词', 'Words reviewed': '已复习单词', 'Words mastered': '已掌握单词', 'Reviews today': '今日复习', 'Accuracy today': '今日正确率', 'Current streak': '连续学习', '{count} days': '{count} 天',
  'All-time reviews': '全部复习记录', 'Overall accuracy {value}': '总正确率 {value}',
  Again: '重来', Hard: '困难', Good: '良好', Easy: '简单', 'Building today’s queue…': '正在建立今日队列…', 'You are caught up for now.': '当前复习任务已全部完成。',
  'Today’s queue': '今日队列', 'Space to reveal · 1–4 to rate': '空格显示答案 · 1–4 评分', 'Toggle favorite': '切换收藏', 'Toggle difficult': '切换难词', Favorite: '收藏',
  word: '单词', 'English definition not provided': '暂未提供英文释义', '中文释义未提供': '暂未提供中文释义', 'Show answer': '显示答案', Space: '空格',
  'Browse, search, and import the local GRE word collection.': '浏览、搜索并导入本地 GRE 词库。', 'Search vocabulary': '搜索词库', 'Search words or definitions': '搜索单词或释义', Search: '搜索', 'Import CSV': '导入 CSV',
  'Template saved to {path}': '模板已保存至 {path}', 'CSV quick start': 'CSV 快速入门', 'Import your first words': '导入第一批单词',
  'Save the template, add one word per row, keep it as UTF-8 CSV, then choose Import CSV.': '保存模板，每行添加一个单词，以 UTF-8 CSV 格式保存，然后选择“导入 CSV”。',
  'Required columns': '必填列', 'Useful optional columns': '常用选填列', 'CSV example': 'CSV 示例', 'Save CSV template': '保存 CSV 模板',
  Word: '单词', Meaning: '释义', Tier: '级别', Status: '状态', Priority: '优先级', 'No vocabulary yet. Import a CSV to begin.': '词库还是空的，请导入 CSV 开始使用。', 'Loading…': '正在加载…',
  'Words saved for quick access.': '你收藏的单词。', 'Words that deserve extra attention.': '需要重点学习的单词。', Action: '操作', Remove: '移除', 'No {type} words yet.': '暂无{type}单词。',
  'Back to vocabulary': '返回词库', Pronunciation: '发音', 'Part of speech': '词性', 'Not provided': '暂未提供', Reviews: '复习次数', Example: '例句', Sources: '来源', 'Personal notes': '个人笔记',
  'Add notes, mnemonics, or usage reminders': '添加笔记、助记或用法提醒', 'Notes saved locally.': '笔记已保存在本地。', 'Saving…': '正在保存…', 'Save notes': '保存笔记', 'Word not found.': '未找到该单词。',
  'Pronunciation not provided': '暂未提供发音', 'part of speech not provided': '暂未提供词性', '未提供': '暂未提供', 'No example provided.': '暂未提供例句。', 'Add a mnemonic, distinction, or reminder…': '添加助记、辨析或提醒…', 'Saved locally.': '已保存在本地。',
  new: '新词', learning: '学习中', review: '复习中', mastered: '已掌握', suspended: '已暂停',
}

export type TranslationVariables = Record<string, string | number>

export function translate(language: 'en' | 'zh', text: string, variables: TranslationVariables = {}): string {
  const template = language === 'zh' ? (zh[text] ?? text) : text
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(variables[key] ?? `{${key}}`))
}

export function useI18n() {
  const language = useSettingsStore((state) => state.settings.interfaceLanguage)
  const t = useCallback((text: string, variables?: TranslationVariables) => translate(language, text, variables), [language])
  return { language, t }
}
