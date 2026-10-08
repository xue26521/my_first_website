/**
 * favorites 数据访问层（DAO）
 * Day 19 重构：从 index.js 抽出的「查/写数据库」代码。
 * 只负责 favorites / tools 表的数据操作，不关心 HTTP 请求/响应。
 */
const { query, insert, update, remove } = require("./db-client");

/** 判断工具是否存在（校验 toolId 是否合法） */
async function toolExists(toolId) {
  const rows = await query("tools", {
    select: "id",
    filter: `id=eq.${toolId}`,
  });
  return rows.length > 0;
}

/** 判断某工具是否已收藏（防重复提交，跳过已软删除的记录） */
async function alreadyFavorited(toolId) {
  const rows = await query("favorites", {
    select: "id",
    filter: `tool_id=eq.${toolId}&is_deleted=eq.false`,
  });
  return rows.length > 0;
}

/** 按 id 查一条收藏记录（含软删除的），用于 PATCH/DELETE 前的存在性校验 */
async function getFavoriteById(id) {
  const rows = await query("favorites", {
    select: "id,tool_id,is_deleted",
    filter: `id=eq.${id}`,
  });
  return rows[0] || null;
}

/** 判断某工具是否已被「其他」收藏记录占用（排除 excludeId），用于 PATCH 改 toolId 的唯一性校验 */
async function isToolFavoritedByOthers(toolId, excludeId) {
  const rows = await query("favorites", {
    select: "id",
    filter: `tool_id=eq.${toolId}&is_deleted=eq.false&id=neq.${excludeId}`,
  });
  return rows.length > 0;
}

/** 写入一条收藏记录，返回插入后的行 */
async function insertFavorite(toolId) {
  const rows = await insert("favorites", { tool_id: toolId });
  return rows[0];
}

/** 读收藏列表（含关联的工具名/图标），跳过软删除的记录 */
async function listFavorites() {
  const favs = await query("favorites", {
    select: "id,tool_id,created_at",
    filter: "is_deleted=eq.false",
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

/**
 * PATCH：改一条收藏。支持两种改法：
 *   - 改收藏的工具（toolId）
 *   - 软删除/恢复（isDeleted）
 * 返回更新后的行。
 */
async function updateFavorite(id, patch) {
  const fields = {};
  if (patch.toolId != null) fields.tool_id = patch.toolId;
  if (patch.isDeleted != null) fields.is_deleted = patch.isDeleted;
  if (Object.keys(fields).length === 0) {
    throw new Error("PATCH 没有可更新的字段");
  }
  const rows = await update("favorites", fields, `id=eq.${id}`);
  return rows[0] || null;
}

/** 软删除：不真删，只打 is_deleted 标记（余力加练），删错了能找回 */
async function softDeleteFavorite(id) {
  const rows = await update("favorites", { is_deleted: true }, `id=eq.${id}`);
  return rows[0] || null;
}

/** 硬删除：真删一条收藏记录 */
async function deleteFavorite(id) {
  await remove("favorites", `id=eq.${id}`);
}

module.exports = {
  toolExists,
  alreadyFavorited,
  getFavoriteById,
  isToolFavoritedByOthers,
  insertFavorite,
  listFavorites,
  updateFavorite,
  softDeleteFavorite,
  deleteFavorite,
};
