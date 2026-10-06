/**
 * tools 数据访问层（DAO）
 * Day 20 新增：从 shared/db-client 复制后，封装 tools 表的具体查询。
 * 只负责查 tools 表，不关心 HTTP 请求/响应。
 */
const { query } = require("./db-client");

/**
 * 读已上线工具列表。
 * @returns {Promise<Array>} [{ id, slug, name, icon, category, description, updated_at }]
 */
async function listTools() {
  return query("tools", {
    select: "id,slug,name,icon,category,description,updated_at",
    filter: "is_active=eq.true",
    order: "sort_order.asc",
  });
}

/**
 * 取已上线工具里最近一次更新的时间（用于前端「最后更新时间」展示）。
 * @returns {Promise<string|null>} 最新的 updated_at，或 null
 */
async function lastUpdated() {
  const rows = await query("tools", {
    select: "updated_at",
    filter: "is_active=eq.true",
    order: "updated_at.desc",
    limit: 1,
  });
  return rows.length ? rows[0].updated_at : null;
}

module.exports = { listTools, lastUpdated };
