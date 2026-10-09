/**
 * /api/tools 读接口（HTTP 云函数）
 * Day 20：读 tools 表，返回已上线工具列表，供首页展示真实数据库数据。
 * 复用 Day 19 的 DAO 分层 —— 数据库操作在 db.js，本文件只保留 HTTP 路由逻辑。
 *
 * 返回结构：{ ok: true, data: [{ id, slug, name, icon, category, description }] }
 * 只返回 is_active=true 的工具，按 sort_order 升序。
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

  try {
    // 数据访问交给 DAO 层（db.js），这里只负责「转成接口约定的字段」
    const [rows, updatedAt] = await Promise.all([
      db.listTools(),
      db.lastUpdated(),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      icon: r.icon,
      category: r.category,
      description: r.description,
    }));

    sendJson(res, 200, { ok: true, data, updatedAt });
    logRequest(req.method, req.url, 200);
  } catch (err) {
    // 裸报错只写日志，不回给前端（不泄露内部英文技术细节）
    console.error("[tools] error:", err.message);
    sendJson(res, 500, { ok: false, message: "服务器内部错误，请稍后重试" });
    logRequest(req.method, req.url, 500);
  }
});

server.listen(9000, "0.0.0.0", () => {
  console.log("tools function listening on 9000");
});
