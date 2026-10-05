/**
 * /api/hot 读接口（HTTP 云函数）
 * Day 17：读 hot 表，返回真实热搜列表。
 * Day 19：重构 —— 数据库操作抽到 db.js（数据访问层），本文件只保留 HTTP 路由逻辑。
 *
 * 返回结构：{ ok: true, data: [{ id, title, hotValue, url, source, fetchedAt }] }
 * 支持查询参数 limit（默认 20，最大 50）。
 */
const http = require("http");
const db = require("./db");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 404, { ok: false, message: "Not Found" });
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const rawLimit = Number(url.searchParams.get("limit") || 20);
  const limit = Math.min(Math.max(rawLimit, 1), 50);

  try {
    // 数据访问交给 DAO 层（db.js），这里只负责「转成接口约定的字段」
    const rows = await db.listHot(limit);

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      hotValue: Number(r.hot_value),
      url: r.url,
      source: r.source,
      fetchedAt: r.fetched_at,
    }));

    sendJson(res, 200, { ok: true, data });
  } catch (err) {
    console.error("[hot] error:", err.message);
    sendJson(res, 500, { ok: false, message: "数据库查询失败", error: err.message });
  }
});

server.listen(9000, "0.0.0.0", () => {
  console.log("hot function listening on 9000");
});
