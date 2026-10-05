/**
 * /api/favorites 读写接口（HTTP 云函数）
 * Day 17：读 favorites 表（JOIN tools），返回收藏的工具列表。
 * Day 18：新增 POST 写入，支持收藏一个工具，并做三重输入防护。
 * Day 19：重构 —— 数据库操作抽到 db.js（数据访问层），本文件只保留 HTTP 路由 + 校验逻辑。
 *
 * GET  返回结构：{ ok: true, data: [{ id, toolId, name, icon, slug, createdAt }] }
 * POST 请求体：  { toolId: number }  （必填）
 * POST 成功返回：{ ok: true, data: { id, toolId, createdAt } }
 * POST 错误返回：{ ok: false, message: "中文提示" }
 */
const http = require("http");
const db = require("./db");

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

async function handleGet(res) {
  const data = await db.listFavorites();
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
  if (!(await db.toolExists(toolId))) {
    sendJson(res, 400, {
      ok: false,
      message: `工具不存在（toolId=${toolId}），无法收藏`,
    });
    return;
  }

  // 防护 3：重复提交（该工具已收藏）
  if (await db.alreadyFavorited(toolId)) {
    sendJson(res, 409, {
      ok: false,
      message: "该工具已在收藏列表中，请勿重复收藏",
    });
    return;
  }

  // 写入（唯一约束兜底，若并发重复插入会抛错走 catch）
  const row = await db.insertFavorite(toolId);
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
