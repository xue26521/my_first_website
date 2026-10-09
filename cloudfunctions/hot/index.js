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

// CORS 说明（Day 20 晚间修复）：
// CloudBase HTTP 网关（WEB_SCF 路由）会自动附加 Access-Control-Allow-Origin: <可信来源>。
// 云函数若再自带 ACAO: *，响应头会变成 "<origin>,*" 两个值——
// 浏览器规范只允许一个值，直接报 CORS 错误（Failed to fetch）。
// 所以这里不再自己设置 CORS 头，跨域统一交给网关处理（见 api-contract.md §3.3）。

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

// 简单请求日志（Day 23 余力加练）：时间、方法、路径、结果
function logRequest(method, url, status) {
  const time = new Date().toISOString();
  console.log(`[req] ${time} ${method} ${url} -> ${status}`);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 404, { ok: false, message: "接口不存在，请检查请求路径" });
    logRequest(req.method, req.url, 404);
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
    logRequest(req.method, req.url, 200);
  } catch (err) {
    // 裸报错只写日志，不回给前端（不泄露内部英文技术细节，也不让用户看到"Unexpected end of JSON"这种话）
    console.error("[hot] error:", err.message);
    sendJson(res, 500, { ok: false, message: "服务器内部错误，请稍后重试" });
    logRequest(req.method, req.url, 500);
  }
});

server.listen(9000, "0.0.0.0", () => {
  console.log("hot function listening on 9000");
});
