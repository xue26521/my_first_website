/**
 * /api/health 健康检查（HTTP 云函数）
 * Day 15：第一个部署到公网的接口
 *
 * HTTP 云函数规范：用原生 http 模块监听 9000 端口，
 * 通过 req/res 处理请求，返回 JSON。
 */
const http = require("http");

// CORS 头（允许任意来源访问，方便前端跨域调用）
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

const server = http.createServer((req, res) => {
  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const now = new Date();

  // 只响应 GET 请求（健康检查用 GET 就够了）
  if (req.method === "GET") {
    sendJson(res, 200, {
      code: 0,
      message: "ok",
      data: {
        status: "healthy",           // 健康状态标志
        service: "my-first-website", // 服务名
        time: now.toISOString(),     // 服务器当前时间（ISO 格式）
        timestamp: now.getTime(),    // 毫秒时间戳
      },
    });
    return;
  }

  // 其他方法返回 404
  sendJson(res, 404, { code: 404, message: "Not Found" });
});

// 必须监听 9000 端口（平台硬性要求）
server.listen(9000, "0.0.0.0", () => {
  console.log("health function listening on 9000");
});
