/**
 * /api/favorites 读写接口（HTTP 云函数）
 * Day 17：读 favorites 表（JOIN tools），返回收藏的工具列表。
 * Day 18：新增 POST 写入，支持收藏一个工具，并做三重输入防护。
 *
 * 数据访问：REST 网关 + API Key（PostgREST 规范，同 hot）。
 *
 * GET  返回结构：{ ok: true, data: [{ id, toolId, name, icon, slug, createdAt }] }
 * POST 请求体：  { toolId: number }  （必填）
 * POST 成功返回：{ ok: true, data: { id, toolId, createdAt } }
 * POST 错误返回：{ ok: false, message: "中文提示" }
 *
 * 防重复提交 / 错误输入（Day 18 核心）：
 *   1. toolId 缺失或非正整数  → 400「缺少必填字段 toolId」
 *   2. toolId 对应工具不存在  → 400「工具不存在，无法收藏」
 *   3. 该工具已收藏过        → 409「该工具已在收藏列表中，请勿重复收藏」
 *   数据库层另有 tool_id 唯一约束兜底，双重保障。
 */
const http = require("http");

const ENV_ID = process.env.ENV_ID || "mywebsite-d7gwnykd4faa93718";
const API_KEY = process.env.CLOUDBASE_API_KEY || "";
const GATEWAY = `https://${ENV_ID}.api.tcloudbasegateway.com`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(data));
}

// 读取请求体（JSON）
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    req.on("error", reject);
  });
}

// 通过 REST 网关读工具，校验 toolId 是否存在
async function toolExists(toolId) {
  const resp = await fetch(
    `${GATEWAY}/v1/rdb/rest/tools?select=id&id=eq.${toolId}`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  if (!resp.ok) throw new Error(`tools 查询失败: ${resp.status}`);
  const rows = await resp.json();
  return rows.length > 0;
}

// 通过 REST 网关查该工具是否已收藏
async function alreadyFavorited(toolId) {
  const resp = await fetch(
    `${GATEWAY}/v1/rdb/rest/favorites?select=id&tool_id=eq.${toolId}`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  if (!resp.ok) throw new Error(`favorites 查询失败: ${resp.status}`);
  const rows = await resp.json();
  return rows.length > 0;
}

// 写入收藏记录（PostgREST INSERT）
async function insertFavorite(toolId) {
  const resp = await fetch(`${GATEWAY}/v1/rdb/rest/favorites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ tool_id: toolId }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`favorites 写入失败 ${resp.status}: ${text.slice(0, 200)}`);
  }
  const rows = await resp.json();
  return rows[0];
}

async function handleGet(res) {
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

  const toolIds = [...new Set(favs.map((f) => f.tool_id))];
  const toolResp = await fetch(
    `${GATEWAY}/v1/rdb/rest/tools?select=id,name,icon,slug&id=in.(${toolIds.join(",")})`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  if (!toolResp.ok) throw new Error(`tools 查询失败: ${toolResp.status}`);
  const tools = await toolResp.json();
  const toolMap = Object.fromEntries(tools.map((t) => [t.id, t]));

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
}

async function handlePost(res, body) {
  // 防护 1：缺必填字段 toolId
  const toolId = Number(body.toolId);
  if (!body.toolId || !Number.isInteger(toolId) || toolId <= 0) {
    sendJson(res, 400, {
      ok: false,
      message: "缺少必填字段 toolId，或 toolId 不是正整数",
    });
    return;
  }

  // 防护 2：toolId 对应的工具不存在（错误输入）
  if (!(await toolExists(toolId))) {
    sendJson(res, 400, {
      ok: false,
      message: `工具不存在（toolId=${toolId}），无法收藏`,
    });
    return;
  }

  // 防护 3：重复提交（该工具已收藏）
  if (await alreadyFavorited(toolId)) {
    sendJson(res, 409, {
      ok: false,
      message: "该工具已在收藏列表中，请勿重复收藏",
    });
    return;
  }

  // 写入（唯一约束兜底，若并发重复插入会抛错走 catch）
  const row = await insertFavorite(toolId);
  console.log(`[favorites] 新增收藏: id=${row.id}, toolId=${toolId}`);

  sendJson(res, 201, {
    ok: true,
    data: {
      id: row.id,
      toolId: row.tool_id,
      createdAt: row.created_at,
    },
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  try {
    if (req.method === "GET") {
      await handleGet(res);
      return;
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      await handlePost(res, body);
      return;
    }
    sendJson(res, 404, { ok: false, message: "Not Found" });
  } catch (err) {
    console.error("[favorites] error:", err.message);
    // 唯一约束兜底：并发重复插入时 PostgREST 返回 409，这里转成友好中文提示
    if (/重复|duplicate|unique|409/i.test(err.message)) {
      sendJson(res, 409, {
        ok: false,
        message: "该工具已在收藏列表中，请勿重复收藏",
      });
    } else {
      sendJson(res, 500, { ok: false, message: "服务器内部错误", error: err.message });
    }
  }
});

server.listen(9000, "0.0.0.0", () => {
  console.log("favorites function listening on 9000 (GET + POST)");
});
