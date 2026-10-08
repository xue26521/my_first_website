/**
 * 数据访问层（DAO）—— 通用数据库客户端
 * Day 19 重构：把原来散落在各云函数里的「查数据库」代码，统一抽到这里。
 *
 * 分层思路：
 *   云函数 index.js（HTTP 路由层）── 只负责「接请求 → 调 DAO → 回响应」
 *        │
 *        ▼
 *   数据访问层 db.js（DAO 层）────── 只负责「拼 SQL/URL → fetch REST 网关 → 返回数据」
 *
 * 这样「查数据库」这段代码从 index.js（HTTP 层）移到了 db.js（数据访问层），
 * 路由层不再关心数据怎么来的，DAO 层也不关心请求怎么进来。
 *
 * 数据访问方式：CloudBase REST 网关（PostgREST 规范），用服务端 API Key 鉴权。
 * 为什么不用 pg 直连：体验版环境暂无直连参数（见 Day 17 记录）。
 *
 * 注意：CloudBase 云函数部署时只打包各自目录，所以这个共享文件
 * 会被复制到每个需要它的云函数目录里（cloudfunctions/<fn>/db.js）。
 * 本文件是「源模板」，修改后需同步复制。
 */
const ENV_ID = process.env.ENV_ID || "mywebsite-d7gwnykd4faa93718";
const API_KEY = process.env.CLOUDBASE_API_KEY || "";
const GATEWAY = `https://${ENV_ID}.api.tcloudbasegateway.com`;

/**
 * 底层：向 REST 网关发请求，统一处理鉴权和错误。
 * @param {string} path 网关路径（如 /v1/rdb/rest/hot）
 * @param {object} options fetch 选项
 * @returns {Promise<Array|Object>} 解析后的 JSON
 */
async function gatewayFetch(path, options = {}) {
  const resp = await fetch(`${GATEWAY}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`数据库请求失败 ${resp.status}: ${text.slice(0, 200)}`);
    err.statusCode = resp.status;
    throw err;
  }
  // DELETE 成功返回 204 No Content（空 body），此时不能 resp.json()（会抛 Unexpected end of JSON input）
  if (resp.status === 204) return null;
  return resp.json();
}

/**
 * 通用查询：GET 一张表，返回行数组。
 * @param {string} table 表名
 * @param {object} opts { select, order, limit, filter } filter 为 PostgREST 查询字符串
 */
async function query(table, opts = {}) {
  const params = [];
  if (opts.select) params.push(`select=${opts.select}`);
  if (opts.order) params.push(`order=${opts.order}`);
  if (opts.limit != null) params.push(`limit=${opts.limit}`);
  if (opts.filter) params.push(opts.filter);
  const qs = params.length ? `?${params.join("&")}` : "";
  return gatewayFetch(`/v1/rdb/rest/${table}${qs}`);
}

/**
 * 通用写入：POST 一张表，返回插入后的行。
 */
async function insert(table, row) {
  return gatewayFetch(`/v1/rdb/rest/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
}

/**
 * 通用更新：PATCH 一张表，按 filter 更新匹配的行，返回更新后的行（Day 22 新增）。
 */
async function update(table, patch, filter) {
  return gatewayFetch(`/v1/rdb/rest/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
}

/**
 * 通用删除：DELETE 一张表，按 filter 删除匹配的行（Day 22 新增）。
 */
async function remove(table, filter) {
  await gatewayFetch(`/v1/rdb/rest/${table}?${filter}`, {
    method: "DELETE",
  });
}

module.exports = {
  GATEWAY,
  gatewayFetch,
  query,
  insert,
  update,
  remove,
};
