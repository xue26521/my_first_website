/* 工具箱主视图 · 数据源
 * Day 8：模拟将来从 API 返回的工具列表数据
 * Day 20：接入真实后端 —— fetch 公网 /api/tools 接口，拿到数据库真实数据。
 *         字段映射：接口 category→tag、description→desc，并补上各工具的落地页 url。
 */

// 公网接口根地址（云函数 HTTP 网关）
// 前端静态托管域名与接口域名不同源，靠后端返回的 CORS 头放行（见 api-contract.md §3.3）
const API_BASE = "https://mywebsite-d7gwnykd4faa93718.service.tcloudbase.com";

// 各工具 slug 对应的落地页地址（tools 表只存元信息，不存页面 url）
const TOOL_PAGES = {
  timer: "timer.html",
  converter: "converter.html",
  password: "password.html",
  translate: "translate.html",
};

/* 从公网接口拉取已上线工具列表
 * 返回 { tools: [...], updatedAt: string|null }
 * tools 字段对齐前端渲染：{ id, name, icon, desc, tag, url }
 */
async function fetchTools() {
  const resp = await fetch(`${API_BASE}/api/tools`);
  if (!resp.ok) {
    throw new Error(`接口返回 ${resp.status}`);
  }
  const json = await resp.json();
  if (!json.ok || !Array.isArray(json.data)) {
    throw new Error("接口返回格式异常");
  }
  const tools = json.data.map((t) => ({
    id: t.slug,
    name: t.name,
    icon: t.icon,
    desc: t.description,
    tag: t.category,
    url: TOOL_PAGES[t.slug] || "#",
  }));
  return { tools, updatedAt: json.updatedAt || null };
}
