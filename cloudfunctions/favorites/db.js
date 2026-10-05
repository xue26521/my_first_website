/**
 * favorites 数据访问层（DAO）
 * Day 19 重构：从 index.js 抽出的「查/写数据库」代码。
 * 只负责 favorites / tools 表的数据操作，不关心 HTTP 请求/响应。
 */
const { query, insert } = require("./db-client");

/** 判断工具是否存在（校验 toolId 是否合法） */
async function toolExists(toolId) {
  const rows = await query("tools", {
    select: "id",
    filter: `id=eq.${toolId}`,
  });
  return rows.length > 0;
}

/** 判断某工具是否已收藏（防重复提交） */
async function alreadyFavorited(toolId) {
  const rows = await query("favorites", {
    select: "id",
    filter: `tool_id=eq.${toolId}`,
  });
  return rows.length > 0;
}

/** 写入一条收藏记录，返回插入后的行 */
async function insertFavorite(toolId) {
  const rows = await insert("favorites", { tool_id: toolId });
  return rows[0];
}

/** 读收藏列表（含关联的工具名/图标） */
async function listFavorites() {
  const favs = await query("favorites", {
    select: "id,tool_id,created_at",
    order: "created_at.desc",
  });

  if (favs.length === 0) return [];

  const toolIds = [...new Set(favs.map((f) => f.tool_id))];
  const tools = await query("tools", {
    select: "id,name,icon,slug",
    filter: `id=in.(${toolIds.join(",")})`,
  });
  const toolMap = Object.fromEntries(tools.map((t) => [t.id, t]));

  return favs.map((f) => {
    const t = toolMap[f.tool_id] || {};
    return {
      id: f.id,
      toolId: f.tool_id,
      name: t.name || "未知工具",
      icon: t.icon || "🧰",
      slug: t.slug || "",
      createdAt: f.created_at,
    };
  });
}

module.exports = { toolExists, alreadyFavorited, insertFavorite, listFavorites };
