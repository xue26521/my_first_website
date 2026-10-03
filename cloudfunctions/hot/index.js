/**
 * /api/hot 读接口（HTTP 云函数）
 * Day 17：读 hot 表，返回真实热搜列表。
 *
 * 数据访问方式：通过 CloudBase REST 网关（PostgREST 规范）读 PostgreSQL，
 * 用服务端 API Key（service_role）鉴权。API Key 从环境变量 CLOUDBASE_API_KEY 读取，
 * 不写死在代码里（避免泄露到 GitHub）。
 *
 * 为什么不用 pg 直连：体验版环境暂无直连参数/网络通路（见官方社区 issue），
 * REST 网关是当前最可靠的访问方式。
 *
 * 返回结构：{ ok: true, data: [{ id, title, hotValue, url, source, fetchedAt }] }
 * 支持查询参数 limit（默认 20，最大 50）。
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

  const url = new URL(req.url, "http://localhost");
  const rawLimit = Number(url.searchParams.get("limit") || 20);
  const limit = Math.min(Math.max(rawLimit, 1), 50);

  try {
    // 通过 REST 网关读 hot 表，按热度倒序，取前 N 条
    const restUrl =
      `${GATEWAY}/v1/rdb/rest/hot` +
      `?select=id,title,hot_value,url,source,fetched_at` +
      `&order=hot_value.desc&limit=${limit}`;

    const resp = await fetch(restUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`REST 网关返回 ${resp.status}: ${text.slice(0, 200)}`);
    }

    const rows = await resp.json();

    // 转成接口约定的小驼峰字段
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
