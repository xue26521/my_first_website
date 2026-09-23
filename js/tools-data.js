/* Mock 数据 · 工具箱主视图
 * Day 8：模拟将来从 API 返回的工具列表数据
 * 第 3 周接真实 API 时，只需把数据源从本文件换成 fetch，页面逻辑不变
 */
const MOCK_TOOLS = [
  { id: "timer",     name: "倒计时器",   icon: "⏱️", desc: "设置倒计时，时间到提醒你", url: "timer.html",     tag: "时间管理" },
  { id: "converter", name: "单位换算器", icon: "📐", desc: "长度 / 重量 / 温度互转",   url: "converter.html", tag: "计算" },
  { id: "password",  name: "密码生成器", icon: "🔑", desc: "本地生成随机强密码",       url: "password.html",  tag: "安全" },
  { id: "translate", name: "中英翻译",   icon: "🌐", desc: "离线词典，双向互译",       url: "translate.html", tag: "语言" },
];

/* 模拟接口：延迟 600ms 返回数据，复刻真实 API 的异步感
 * 调试参数（仅本地演示用）：
 *   ?state=empty  → 返回空数组（演示空状态）
 *   ?state=error  → 抛出错误（演示错误状态）
 */
function fetchTools() {
  const state = new URLSearchParams(location.search).get("state");
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (state === "error") reject(new Error("模拟加载失败"));
      else if (state === "empty") resolve([]);
      else resolve(MOCK_TOOLS);
    }, 600);
  });
}
