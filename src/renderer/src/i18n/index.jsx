import React, { createContext, useContext, useState, useCallback } from 'react'

// ─── English ──────────────────────────────────────────────────────────────────
const en = {
  // App / loading
  app_name: 'NetRadar Network Connections',
  loading_badge: 'Preparing diagnostics console',

  // TitleBar
  tb_close: 'Close',
  tb_restore: 'Restore',
  tb_maximize: 'Maximize',
  tb_minimize: 'Minimize',
  tb_version: 'v1.0.0',

  // TitleBar view titles
  view_dashboard: 'Local Area Connection Status',
  view_history: 'Connection History',
  view_config: 'Connection Properties',

  // TitleBar status labels
  st_idle: 'Ready',
  st_latency: 'Checking latency',
  st_download: 'Testing download',
  st_upload: 'Testing upload',
  st_scoring: 'Calculating quality',
  st_complete: 'Last test completed',
  st_error: 'Test error',

  // Toolbar
  toolbar_address: 'Address',
  toolbar_conn_state: 'Connection State',

  // View meta — paths
  path_dashboard: 'My Network Places > Local Area Connection',
  path_history: 'My Network Places > Connection Reports',
  path_config: 'My Network Places > Local Area Connection Properties',

  // View meta — titles / subtitles
  title_dashboard: 'Local Area Connection Status',
  subtitle_dashboard: 'View current activity, connection quality, and support details for the selected network route.',
  title_history: 'Connection History',
  subtitle_history: 'Review saved speed-test reports and compare previous network sessions in a single list view.',
  title_config: 'Local Area Connection Properties',
  subtitle_config: 'Choose which servers are enabled and adjust the diagnostic settings used by this connection.',

  // Status copy
  sc_idle: 'Connected and ready',
  sc_latency: 'Checking server response time',
  sc_download: 'Measuring receive throughput',
  sc_upload: 'Measuring send throughput',
  sc_scoring: 'Updating connection score',
  sc_complete: 'Last diagnostics pass completed',
  sc_error: 'Last diagnostics pass requires attention',

  // Navbar
  nav_tasks: 'Network Tasks',
  nav_details: 'Details',
  nav_places: 'Network Places',
  nav_tab_status: 'Status',
  nav_tab_status_desc: 'Open the current connection status window',
  nav_tab_history: 'History',
  nav_tab_history_desc: 'Review saved connection reports',
  nav_tab_config: 'Properties',
  nav_tab_config_desc: 'Change servers and test parameters',
  nav_st_idle: 'Connected',
  nav_st_latency: 'Diagnosing',
  nav_st_download: 'Downloading',
  nav_st_upload: 'Uploading',
  nav_st_scoring: 'Rating link',
  nav_st_complete: 'Healthy',
  nav_st_error: 'Attention needed',
  nav_detail_status: 'Status',
  nav_detail_servers: 'Enabled servers',
  nav_detail_route: 'Default route',
  nav_detail_reports: 'Saved reports',
  nav_place_network: 'My Network Places',
  nav_place_entire: 'Entire Network',
  nav_place_panel: 'Control Panel',
  nav_local_conn: 'Local Area Connection',
  nav_not_set: 'Not set',

  // Dashboard — phase labels
  phase_latency: 'Checking server response time',
  phase_download: 'Receiving test data from the selected server',
  phase_upload: 'Sending test data back to the selected server',
  phase_scoring: 'Calculating the final connection quality report',
  phase_complete: 'This connection is connected and the latest report is ready',
  phase_error: 'The last connection test ended with an error',
  phase_idle: 'This connection is connected and ready for a new test',

  // Dashboard panels
  panel_general: 'General',
  panel_activity: 'Activity',
  panel_conn_details: 'Connection Details',
  panel_support: 'Support',
  panel_quality: 'Connection Quality',
  panel_terminal: 'Connection Activity',

  // Dashboard — general panel
  conn_title: 'Local Area Connection',
  conn_no_server: 'No enabled server is available',
  btn_cancel: 'Cancel Test',
  btn_start: 'Start Test',
  btn_run_again: 'Run Again',
  btn_retry: 'Retry Test',
  conn_actions_note: 'Start a diagnostics pass to refresh transfer rates, latency, jitter, and the final quality score.',
  sum_status: 'Status',
  sum_route: 'Default route',
  sum_host: 'Server host',
  sum_quality: 'Quality',
  sum_latency: 'Latency',
  sum_reports: 'Saved reports',
  sum_attention: 'Attention required',
  sum_testing: 'Testing link',
  sum_connected: 'Connected',
  sum_ready: 'Ready',
  sum_not_rated: 'Not rated',
  sum_pending: 'Pending',
  sum_not_configured: 'Not configured',

  // Dashboard — activity panel
  act_title: 'Current transfer activity',
  act_running_text: 'The active phase is {phase}. NetRadar updates these meters while the test is running.',
  act_idle_text: 'These meters show the most recent diagnostics result for the selected connection.',
  act_progress: 'Progress',
  act_waiting: 'Waiting',
  act_last_complete: 'Last run complete',
  gauge_download_title: 'Bytes Received',
  gauge_download_sub: 'Download throughput',
  gauge_upload_title: 'Bytes Sent',
  gauge_upload_sub: 'Upload throughput',
  gauge_label_dl: 'DOWNLOAD',
  gauge_label_ul: 'UPLOAD',

  // Dashboard — support panel
  lan_icon: 'LAN',
  support_preferred: 'Preferred route',
  support_yes: 'Yes',
  support_no: 'No',
  support_dl_path: 'Download path',
  support_ul_path: 'Upload path',
  support_lat_path: 'Latency path',
  support_progress: 'Progress',
  support_phase: 'Current phase',
  support_waiting: 'Waiting for data',
  support_note: 'Use the Start Test button to refresh the selected route and update the support information shown here.',
  support_host: 'Host',
  support_no_server_title: 'No enabled server',
  support_no_server_text: 'Enable or add a server in Properties before starting a diagnostics pass.',

  // StatsGrid
  metric_latency: 'Latency',
  metric_latency_desc: 'Average round-trip response',
  metric_jitter: 'Jitter',
  metric_jitter_desc: 'Variation between samples',
  metric_best: 'Best Sample',
  metric_best_desc: 'Lowest observed response',
  metric_worst: 'Worst Sample',
  metric_worst_desc: 'Highest observed response',

  // ScoreBoard
  sb_grade: 'Grade',
  sb_awaiting: 'Awaiting a test run',
  sb_note: 'Higher scores indicate faster throughput and more stable latency.',
  sb_dl: 'Download',
  sb_ul: 'Upload',
  sb_latency: 'Latency',
  sb_jitter: 'Jitter',

  // TerminalLog
  term_running: 'Running',
  term_completed: 'Completed',
  term_error: 'Error',
  term_events: '{n} events',
  term_empty_title: 'No activity yet',
  term_empty_text: 'Start a test to populate connection events and diagnostics output.',
  term_monitoring: 'Monitoring current traffic…',

  // HistoryPanel
  hist_title: 'Saved Connection Reports',
  hist_latest: 'The latest diagnostics report was captured on {date}.',
  hist_empty_start: 'Run a test to begin storing connection reports in this folder.',
  hist_entries: 'Entries',
  hist_best_grade: 'Best grade',
  hist_avg_score: 'Average score',
  hist_clear: 'Clear History',
  hist_confirm_clear: 'Confirm Clear',
  hist_table_title: 'Reports Stored On This Computer',
  hist_th_time: 'Time',
  hist_th_server: 'Server',
  hist_th_dl: 'Download',
  hist_th_ul: 'Upload',
  hist_th_latency: 'Latency',
  hist_th_jitter: 'Jitter',
  hist_th_score: 'Score',
  hist_th_grade: 'Grade',
  hist_no_reports: 'No reports available',
  hist_no_reports_sub: 'Completed tests are saved here so you can compare previous connection states.',

  // ConfigPanel
  cfg_banner_title: 'Properties for This Connection',
  cfg_banner_text: 'Enable test servers, choose the default route, and control how NetRadar measures this connection.',
  cfg_default_route: 'Default route',
  cfg_location: 'Location',
  cfg_not_set: 'Not set',
  cfg_unknown: 'Unknown',
  cfg_summary_title: 'Connection Summary',
  cfg_enabled_servers: 'Enabled servers',
  cfg_saved_reports: 'Saved reports',
  cfg_file_title: 'Configuration File',
  cfg_file_location: 'Location',
  cfg_open_explorer: 'Open in Explorer',
  cfg_servers_title: 'Speed Test Servers',
  cfg_servers_intro: 'This connection uses the following test routes. Choose which endpoints are enabled and which one opens as the preferred route.',
  cfg_server_default: 'Default',
  cfg_server_dl: 'Download',
  cfg_server_ul: 'Upload',
  cfg_server_latency: 'Latency',
  cfg_server_na: 'N/A',
  cfg_btn_enabled: 'Enabled',
  cfg_btn_disabled: 'Disabled',
  cfg_btn_set_default: 'Set Default',
  cfg_btn_remove: 'Remove',
  cfg_btn_add_server: 'Add Custom Server',
  cfg_add_title: 'Add a custom speed-test endpoint',
  cfg_field_name: 'Server name',
  cfg_field_location: 'Location',
  cfg_field_base_url: 'Base URL',
  cfg_field_dl_path: 'Download path',
  cfg_field_ul_path: 'Upload path',
  cfg_field_lat_path: 'Latency path',
  cfg_btn_save_server: 'Save Server',
  cfg_btn_cancel: 'Cancel',
  cfg_err_name: 'Server name is required',
  cfg_err_url: 'Base URL is required',
  cfg_err_url_invalid: 'Invalid base URL (must include https://)',
  cfg_test_title: 'Test Parameters',
  cfg_test_intro: 'Adjust how much data NetRadar transfers and how many latency samples are collected during a diagnostics pass.',
  cfg_dl_size: 'Download size (MB)',
  cfg_dl_size_hint: 'Larger transfers improve throughput accuracy.',
  cfg_ul_size: 'Upload size (MB)',
  cfg_ul_size_hint: 'Increase for steadier upload readings.',
  cfg_lat_samples: 'Latency samples',
  cfg_lat_samples_hint: 'More samples smooth out noisy links.',
  cfg_timeout: 'Timeout (ms)',
  cfg_timeout_hint: 'Maximum wait time for each request.',
  cfg_btn_restore: 'Restore Defaults',
  cfg_general_title: 'General Settings',
  cfg_general_intro: 'Control whether completed reports are stored and how many items remain in the local history list.',
  cfg_save_history: 'Save history',
  cfg_save_history_hint: 'Keep completed reports for later comparison.',
  cfg_opt_enabled: 'Enabled',
  cfg_opt_disabled: 'Disabled',
  cfg_history_limit: 'History limit',
  cfg_history_limit_hint: 'Oldest items are trimmed when the limit is reached.',
  cfg_language: 'Language',
  cfg_language_hint: 'Interface display language.',
  cfg_attribution: 'NetRadar v1.0.0 · XP-style connection manager',
  cfg_btn_save: 'Apply Settings',
  cfg_btn_saved: 'Saved',
  cfg_loading: 'Loading connection properties...',
}

// ─── Simplified Chinese (Microsoft-style) ─────────────────────────────────────
const zhCN = {
  // App / loading
  app_name: 'NetRadar 网络连接',
  loading_badge: '正在准备诊断控制台',

  // TitleBar
  tb_close: '关闭',
  tb_restore: '还原',
  tb_maximize: '最大化',
  tb_minimize: '最小化',
  tb_version: 'v1.0.0',

  // TitleBar view titles
  view_dashboard: '本地连接 状态',
  view_history: '连接历史记录',
  view_config: '本地连接 属性',

  // TitleBar status labels
  st_idle: '就绪',
  st_latency: '正在检查延迟',
  st_download: '正在测试下载',
  st_upload: '正在测试上传',
  st_scoring: '正在计算质量',
  st_complete: '上次测试已完成',
  st_error: '测试出错',

  // Toolbar
  toolbar_address: '地址',
  toolbar_conn_state: '连接状态',

  // View meta — paths
  path_dashboard: '网络邻居 > 本地连接',
  path_history: '网络邻居 > 连接报告',
  path_config: '网络邻居 > 本地连接 属性',

  // View meta — titles / subtitles
  title_dashboard: '本地连接 状态',
  subtitle_dashboard: '查看当前活动、连接质量以及所选网络路由的支持详细信息。',
  title_history: '连接历史记录',
  subtitle_history: '查看已保存的测速报告，并在一个列表视图中比较以前的网络会话。',
  title_config: '本地连接 属性',
  subtitle_config: '选择启用的服务器，并调整此连接使用的诊断设置。',

  // Status copy
  sc_idle: '已连接，就绪',
  sc_latency: '正在检查服务器响应时间',
  sc_download: '正在测量接收吞吐量',
  sc_upload: '正在测量发送吞吐量',
  sc_scoring: '正在更新连接评分',
  sc_complete: '上次诊断已完成',
  sc_error: '上次诊断需要处理',

  // Navbar
  nav_tasks: '网络任务',
  nav_details: '详细信息',
  nav_places: '网络位置',
  nav_tab_status: '状态',
  nav_tab_status_desc: '打开当前连接状态窗口',
  nav_tab_history: '历史记录',
  nav_tab_history_desc: '查看已保存的连接报告',
  nav_tab_config: '属性',
  nav_tab_config_desc: '更改服务器和测试参数',
  nav_st_idle: '已连接',
  nav_st_latency: '正在诊断',
  nav_st_download: '正在下载',
  nav_st_upload: '正在上传',
  nav_st_scoring: '正在评级',
  nav_st_complete: '连接正常',
  nav_st_error: '需要处理',
  nav_detail_status: '状态',
  nav_detail_servers: '已启用服务器',
  nav_detail_route: '默认路由',
  nav_detail_reports: '已保存报告',
  nav_place_network: '网络邻居',
  nav_place_entire: '整个网络',
  nav_place_panel: '控制面板',
  nav_local_conn: '本地连接',
  nav_not_set: '未设置',

  // Dashboard — phase labels
  phase_latency: '正在检查服务器响应时间',
  phase_download: '正在从所选服务器接收测试数据',
  phase_upload: '正在将测试数据发送回所选服务器',
  phase_scoring: '正在计算最终连接质量报告',
  phase_complete: '此连接已连接，最新报告已就绪',
  phase_error: '上次连接测试以错误结束',
  phase_idle: '此连接已连接，可以开始新的测试',

  // Dashboard panels
  panel_general: '常规',
  panel_activity: '活动',
  panel_conn_details: '连接详细信息',
  panel_support: '支持',
  panel_quality: '连接质量',
  panel_terminal: '连接活动',

  // Dashboard — general panel
  conn_title: '本地连接',
  conn_no_server: '没有可用的已启用服务器',
  btn_cancel: '取消测试',
  btn_start: '开始测试',
  btn_run_again: '再次运行',
  btn_retry: '重试测试',
  conn_actions_note: '开始诊断以刷新传输速率、延迟、抖动和最终质量评分。',
  sum_status: '状态',
  sum_route: '默认路由',
  sum_host: '服务器主机',
  sum_quality: '质量',
  sum_latency: '延迟',
  sum_reports: '已保存报告',
  sum_attention: '需要处理',
  sum_testing: '正在测试链路',
  sum_connected: '已连接',
  sum_ready: '就绪',
  sum_not_rated: '尚未评级',
  sum_pending: '等待中',
  sum_not_configured: '未配置',

  // Dashboard — activity panel
  act_title: '当前传输活动',
  act_running_text: '当前活动阶段为 {phase}。测试运行时 NetRadar 会实时更新这些仪表。',
  act_idle_text: '这些仪表显示所选连接的最近诊断结果。',
  act_progress: '进度',
  act_waiting: '等待中',
  act_last_complete: '上次运行已完成',
  gauge_download_title: '接收字节数',
  gauge_download_sub: '下载吞吐量',
  gauge_upload_title: '发送字节数',
  gauge_upload_sub: '上传吞吐量',
  gauge_label_dl: '下载',
  gauge_label_ul: '上传',

  // Dashboard — support panel
  lan_icon: 'LAN',
  support_preferred: '首选路由',
  support_yes: '是',
  support_no: '否',
  support_dl_path: '下载路径',
  support_ul_path: '上传路径',
  support_lat_path: '延迟路径',
  support_progress: '进度',
  support_phase: '当前阶段',
  support_waiting: '等待数据',
  support_note: '单击"开始测试"按钮可刷新所选路由并更新此处显示的支持信息。',
  support_host: '主机',
  support_no_server_title: '没有已启用的服务器',
  support_no_server_text: '开始诊断前，请在"属性"中启用或添加服务器。',

  // StatsGrid
  metric_latency: '延迟',
  metric_latency_desc: '平均往返响应时间',
  metric_jitter: '抖动',
  metric_jitter_desc: '各样本之间的变化',
  metric_best: '最佳样本',
  metric_best_desc: '最低观测响应',
  metric_worst: '最差样本',
  metric_worst_desc: '最高观测响应',

  // ScoreBoard
  sb_grade: '等级',
  sb_awaiting: '等待测试运行',
  sb_note: '较高的分数表示更快的吞吐量和更稳定的延迟。',
  sb_dl: '下载',
  sb_ul: '上传',
  sb_latency: '延迟',
  sb_jitter: '抖动',

  // TerminalLog
  term_running: '运行中',
  term_completed: '已完成',
  term_error: '错误',
  term_events: '{n} 个事件',
  term_empty_title: '暂无活动',
  term_empty_text: '开始测试以填充连接事件和诊断输出。',
  term_monitoring: '正在监控当前流量…',

  // HistoryPanel
  hist_title: '已保存的连接报告',
  hist_latest: '最新诊断报告捕获于 {date}。',
  hist_empty_start: '运行测试以开始在此文件夹中存储连接报告。',
  hist_entries: '条目',
  hist_best_grade: '最佳等级',
  hist_avg_score: '平均分数',
  hist_clear: '清除历史记录',
  hist_confirm_clear: '确认清除',
  hist_table_title: '存储在此计算机上的报告',
  hist_th_time: '时间',
  hist_th_server: '服务器',
  hist_th_dl: '下载',
  hist_th_ul: '上传',
  hist_th_latency: '延迟',
  hist_th_jitter: '抖动',
  hist_th_score: '分数',
  hist_th_grade: '等级',
  hist_no_reports: '没有可用报告',
  hist_no_reports_sub: '已完成的测试将保存在此处，以便比较以前的连接状态。',

  // ConfigPanel
  cfg_banner_title: '此连接的属性',
  cfg_banner_text: '启用测试服务器，选择默认路由，并控制 NetRadar 测量此连接的方式。',
  cfg_default_route: '默认路由',
  cfg_location: '位置',
  cfg_not_set: '未设置',
  cfg_unknown: '未知',
  cfg_summary_title: '连接摘要',
  cfg_enabled_servers: '已启用服务器',
  cfg_saved_reports: '已保存报告',
  cfg_file_title: '配置文件',
  cfg_file_location: '位置',
  cfg_open_explorer: '在资源管理器中打开',
  cfg_servers_title: '测速服务器',
  cfg_servers_intro: '此连接使用以下测试路由。选择启用哪些端点，以及将哪个端点设为首选路由。',
  cfg_server_default: '默认',
  cfg_server_dl: '下载',
  cfg_server_ul: '上传',
  cfg_server_latency: '延迟',
  cfg_server_na: '不适用',
  cfg_btn_enabled: '已启用',
  cfg_btn_disabled: '已禁用',
  cfg_btn_set_default: '设为默认',
  cfg_btn_remove: '删除',
  cfg_btn_add_server: '添加自定义服务器',
  cfg_add_title: '添加自定义测速端点',
  cfg_field_name: '服务器名称',
  cfg_field_location: '位置',
  cfg_field_base_url: '基本 URL',
  cfg_field_dl_path: '下载路径',
  cfg_field_ul_path: '上传路径',
  cfg_field_lat_path: '延迟路径',
  cfg_btn_save_server: '保存服务器',
  cfg_btn_cancel: '取消',
  cfg_err_name: '服务器名称为必填项',
  cfg_err_url: '基本 URL 为必填项',
  cfg_err_url_invalid: '基本 URL 无效（必须包含 https://）',
  cfg_test_title: '测试参数',
  cfg_test_intro: '调整 NetRadar 在诊断期间传输的数据量和收集的延迟样本数。',
  cfg_dl_size: '下载大小 (MB)',
  cfg_dl_size_hint: '较大的传输量可提高吞吐量测量精度。',
  cfg_ul_size: '上传大小 (MB)',
  cfg_ul_size_hint: '增大以获得更稳定的上传读数。',
  cfg_lat_samples: '延迟样本数',
  cfg_lat_samples_hint: '更多样本可平滑嘈杂链路的结果。',
  cfg_timeout: '超时 (ms)',
  cfg_timeout_hint: '每个请求的最长等待时间。',
  cfg_btn_restore: '还原默认值',
  cfg_general_title: '常规设置',
  cfg_general_intro: '控制是否存储已完成的报告，以及本地历史记录列表中保留的条目数。',
  cfg_save_history: '保存历史记录',
  cfg_save_history_hint: '保留已完成的报告以供日后比较。',
  cfg_opt_enabled: '已启用',
  cfg_opt_disabled: '已禁用',
  cfg_history_limit: '历史记录限制',
  cfg_history_limit_hint: '达到限制时将修剪最旧的条目。',
  cfg_language: '语言',
  cfg_language_hint: '界面显示语言。',
  cfg_attribution: 'NetRadar v1.0.0 · XP 风格连接管理器',
  cfg_btn_save: '应用设置',
  cfg_btn_saved: '已保存',
  cfg_loading: '正在加载连接属性...',
}

// ─── Context ──────────────────────────────────────────────────────────────────
const TRANSLATIONS = { en, 'zh-CN': zhCN }

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: k => k })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('netradar-lang') || 'en' } catch { return 'en' }
  })

  const setLang = useCallback((next) => {
    try { localStorage.setItem('netradar-lang', next) } catch {}
    setLangState(next)
  }, [])

  const t = useCallback((key, vars) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
    let value = dict[key] ?? TRANSLATIONS.en[key] ?? key
    if (vars && typeof value === 'string') {
      Object.entries(vars).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      })
    }
    return value
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT() {
  return useContext(LangContext)
}

export const SUPPORTED_LANGS = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '中文（简体）' },
]
