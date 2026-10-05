/**
 * hot 数据访问层（DAO）
 * Day 19 重构：从 index.js 抽出的「查数据库」代码。
 * 只负责查 hot 表，不关心 HTTP 请求/响应。
 */
const { query } = require("./db-client");

/**
 * 按热度倒序读热搜列表。
 * @param {number} limit 返回条数
 * @returns {Promise<Array>} [{ id, title, hot_value, url, source, fetched_at }]
 */
async function listHot(limit) {
  return query("hot", {
    select: "id,title,hot_value,url,source,fetched_at",
    order: "hot_value.desc",
    limit,
  });
}

module.exports = { listHot };
