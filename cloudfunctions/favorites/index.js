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
 *
 * Day 22 新增 PATCH / DELETE（增删改查四类操作闭环）：
 * PATCH  /api/favorites/:id  请求体 { toolId? | isDeleted? }  —— 改收藏的工具，或软删除/恢复
 * DELETE /api/favorites/:id  需 ?confirm=delete 显式确认 —— 硬删除一条收藏
 * 软删除：is_deleted=true 的记录，GET 不再返回（删错了能找回，见 db.softDeleteFavorite）
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

/**
 * PATCH /api/favorites/:id —— 改一条收藏。
 * 请求体 { toolId? | isDeleted? }：
 *   - toolId：改收藏成另一个工具（校验工具存在 + 不重复）
 *   - isDeleted：true 软删除 / false 恢复
 * 两字段可同时传。
 */
async function handlePatch(res, id, body) {
  if (!Number.isInteger(id) || id <= 0) {
    sendJson(res, 400, { ok: false, message: "收藏 id 不是正整数" });
    return;
  }

  // 防护：记录必须存在
  const existing = await db.getFavoriteById(id);
  if (!existing) {
    sendJson(res, 404, { ok: false, message: `收藏记录不存在（id=${id}）` });
    return;
  }

  // 改 toolId 时：校验新工具存在 + 未被其他记录收藏（唯一约束）
  if (body.toolId != null) {
    const newToolId = Number(body.toolId);
    if (!Number.isInteger(newToolId) || newToolId <= 0) {
      sendJson(res, 400, { ok: false, message: "toolId 不是正整数" });
      return;
    }
    if (!(await db.toolExists(newToolId))) {
      sendJson(res, 400, { ok: false, message: `工具不存在（toolId=${newToolId}），无法收藏` });
      return;
    }
    // 目标工具若已被「其他」收藏记录占用（非软删除），则唯一约束冲突
    if (newToolId !== existing.tool_id && (await db.isToolFavoritedByOthers(newToolId, id))) {
      sendJson(res, 409, { ok: false, message: `该工具已在收藏列表中（toolId=${newToolId}），请勿重复收藏` });
      return;
    }
  }

  // 组装 patch（isDeleted 支持软删除/恢复）
  const patch = {};
  if (body.toolId != null) patch.toolId = Number(body.toolId);
  if (body.isDeleted != null) patch.isDeleted = body.isDeleted === true;

  if (Object.keys(patch).length === 0) {
    sendJson(res, 400, { ok: false, message: "PATCH 没有可更新的字段（toolId 或 isDeleted）" });
    return;
  }

  const row = await db.updateFavorite(id, patch);
  if (!row) {
    sendJson(res, 404, { ok: false, message: `收藏记录不存在（id=${id}）` });
    return;
  }
  console.log(`[favorites] 更新收藏: id=${id}, patch=${JSON.stringify(patch)}`);
  sendJson(res, 200, {
    ok: true,
    data: { id: row.id, toolId: row.tool_id, isDeleted: row.is_deleted },
  });
}

/**
 * DELETE /api/favorites/:id?confirm=delete —— 硬删除一条收藏。
 * 「删除为什么更容易出事」的答案就在这里：
 *   删除不可逆（真删了查不回来），所以必须显式确认 —— 请求必须带 ?confirm=delete，
 *   否则拒绝。这是后端侧的「二次确认」，把误删挡在门外。
 */
async function handleDelete(res, id, query) {
  if (!Number.isInteger(id) || id <= 0) {
    sendJson(res, 400, { ok: false, message: "收藏 id 不是正整数" });
    return;
  }

  // 确认机制：URL 必须显式带 confirm=delete，否则 400 拒绝（防误删）
  if (!query || query.confirm !== "delete") {
    sendJson(res, 400, {
      ok: false,
      message: "删除不可逆，请在请求后追加 ?confirm=delete 显式确认后再删",
    });
    return;
  }

  const existing = await db.getFavoriteById(id);
  if (!existing) {
    sendJson(res, 404, { ok: false, message: `收藏记录不存在（id=${id}）` });
    return;
  }

  await db.deleteFavorite(id);
  console.log(`[favorites] 硬删除收藏: id=${id}, toolId=${existing.tool_id}`);
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}

/**
 * 解析 URL 路径与 query，返回 { pathParts, query }。
 * 例：/api/favorites/3?confirm=delete → pathParts=['api','favorites','3'], query={confirm:'delete'}
 */
function parseUrl(url) {
  const [pathname, qs = ""] = url.split("?");
  const pathParts = pathname.split("/").filter(Boolean);
  const query = {};
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const [k, v] = pair.split("=");
    query[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return { pathParts, query };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
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

    // Day 22：PATCH / DELETE 走 /api/favorites/:id
    const { pathParts, query } = parseUrl(req.url);
    if (req.method === "PATCH") {
      const body = await readBody(req);
      const id = Number(pathParts[pathParts.length - 1]);
      await handlePatch(res, id, body);
      return;
    }
    if (req.method === "DELETE") {
      const id = Number(pathParts[pathParts.length - 1]);
      await handleDelete(res, id, query);
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
  console.log("favorites function listening on 9000 (GET/POST/PATCH/DELETE)");
});
