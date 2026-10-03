/**
 * /api/favorites 读接口（HTTP 云函数）
 * Day 17：读 favorites 表（JOIN tools），返回收藏的工具列表。
 *
 * 数据访问：REST 网关 + API Key（同 hot）。
 * 返回结构：{ ok: true, data: [{ id, toolId, name, icon, slug, createdAt }] }
 */
const http = require("http");

const ENV_ID = process.env.ENV_ID || "mywebsite-d7gwnykd4faa93718";
const API_KEY = process.env.CLOUDBASE_API_KEY || "";
const GATEWAY = `https://${ENV_ID}.api.tcloudbasegateway.com`;

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

  try {
    // 先读 favorites 拿到 tool_id 列表
    const favResp = await fetch(
      `${GATEWAY}/v1/rdb/rest/favorites?select=id,tool_id,created_at&order=created_at.desc`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    if (!favResp.ok) throw new Error(`favorites 查询失败: ${favResp.status}`);
    const favs = await favResp.json();

    if (favs.length === 0) {
      sendJson(res, 200, { ok: true, data: [] });
      return;
    }

    // 收集所有 tool_id，去重
    const toolIds = [...new Set(favs.map((f) => f.tool_id))];
    // 用 PostgREST 的 in 过滤读对应工具
    const toolResp = await fetch(
      `${GATEWAY}/v1/rdb/rest/tools?select=id,name,icon,slug&id=in.(${toolIds.join(",")})`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    if (!toolResp.ok) throw new Error(`tools 查询失败: ${toolResp.status}`);
    const tools = await toolResp.json();
    const toolMap = Object.fromEntries(tools.map((t) => [t.id, t]));

    // 组装：收藏记录 + 对应工具信息
    const data = favs.map((f) => {
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

    sendJson(res, 200, { ok: true, data });
  } catch (err) {
    console.error("[favorites] error:", err.message);
    sendJson(res, 500, { ok: false, message: "数据库查询失败", error: err.message });
  }
});

server.listen(9000, "0.0.0.0", () => {
  console.log("favorites function listening on 9000");
});
