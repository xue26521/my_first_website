# API 接口契约（api-contract.md）

> Day 15：定义前端与后端之间的接口约定。前端照这份契约开发，后端照这份契约实现，两边就能无缝对接。

## 1. 基本信息

| 项 | 值 |
|---|---|
| 服务名 | my-first-website |
| 环境 ID | `mywebsite-d7gwnykd4faa93718` |
| 区域 | ap-shanghai（上海） |
| 公网根地址 | `https://mywebsite-d7gwnykd4faa93718.service.tcloudbase.com` |
| 数据格式 | JSON（UTF-8） |

## 2. 接口清单

### 2.1 GET /api/health —— 健康检查

**用途**：探活接口。前端加载时调用它，确认「后端云函数是否在线」。

**请求**：
```
GET /api/health
无参数、无请求体
```

**响应（200 OK）**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "healthy",
    "service": "my-first-website",
    "time": "2026-10-02T13:57:48.000Z",
    "timestamp": 1759999068000
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | number | 0 表示成功，非 0 表示错误 |
| `message` | string | 状态描述，"ok" 表示正常 |
| `data.status` | string | "healthy" 表示服务健康 |
| `data.service` | string | 服务名，用于前端确认没调错服务 |
| `data.time` | string | 服务器当前时间（ISO 8601） |
| `data.timestamp` | number | 毫秒时间戳 |

**错误响应**：非 GET 方法返回 `404 Not Found`。

## 3. 约定规范

1. **统一响应结构**：所有接口都用 `{ code, message, data }` 三层包裹，前端只认这个结构。
2. **code 语义**：`0` = 成功；其他值 = 错误（具体码位 Day 16–20 定义）。
3. **跨域**（Day 20 收尾定稿）：CORS 由 **CloudBase 网关统一处理**——WEB_SCF 路由自动回 `Access-Control-Allow-Origin: <可信来源>`（含本环境静态托管域名），并自动接管 OPTIONS 预检。**云函数内禁止再自带 CORS 头**：否则响应出现 `<origin>,*` 双值，浏览器规范只允许单值，直接报 `Failed to fetch`（Day 20 实测踩坑：curl 不校验 CORS，只有浏览器会暴露）。
4. **字段命名**：小驼峰（camelCase），如 `envId`、`createTime`。

## 4. 业务接口（Day 17–18 新增）

### 4.1 GET /api/hot —— 热门工具/热搜列表（Day 17）

**用途**：返回按热度倒序的真实热搜数据（接 60s.viki.moe 微博热搜源入库）。

**请求**：`GET /api/hot?limit=20`（`limit` 可选，默认 20，最大 50）

**响应（200 OK）**：
```json
{
  "ok": true,
  "data": [
    { "id": 1, "title": "…", "hotValue": 1348614, "url": "https://…", "source": "weibo", "fetchedAt": "2026-10-04T…" }
  ]
}
```

### 4.2 GET /api/favorites —— 收藏列表（Day 17）

**用途**：返回用户收藏的工具列表（JOIN tools 带出工具名/图标）。

**响应（200 OK）**：
```json
{
  "ok": true,
  "data": [
    { "id": 1, "toolId": 1, "name": "倒计时器", "icon": "⏱️", "slug": "timer", "createdAt": "2026-10-03T…" }
  ]
}
```

### 4.3 POST /api/favorites —— 收藏一个工具（Day 18）

**用途**：写入一条收藏记录。这是本项目的第一个写接口。

**请求**：
```
POST /api/favorites
Content-Type: application/json

{ "toolId": 4 }
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `toolId` | number（正整数） | 是 | 要收藏的工具 id（对应 tools.id） |

**成功响应（201 Created）**：
```json
{
  "ok": true,
  "data": { "id": 4, "toolId": 4, "createdAt": "2026-10-04T…" }
}
```

**错误响应（中文提示）**：

| 场景 | 状态码 | 响应 |
|---|---|---|
| 缺 `toolId` / 非正整数 | 400 | `{ "ok": false, "message": "缺少必填字段 toolId，或 toolId 不是正整数" }` |
| `toolId` 对应工具不存在 | 400 | `{ "ok": false, "message": "工具不存在（toolId=999），无法收藏" }` |
| 重复收藏（已存在） | 409 | `{ "ok": false, "message": "该工具已在收藏列表中，请勿重复收藏" }` |

> 防重复：`favorites.tool_id` 有唯一约束，重复提交由数据库层兜底拒绝。

### 4.4 GET /api/tools —— 已上线工具列表（Day 20）

**用途**：首页展示数据库真实工具数据（`tools` 表 `is_active=true`）。

**请求**：`GET /api/tools`（无参数）

**响应（200 OK）**：
```json
{
  "ok": true,
  "data": [
    { "id": 1, "slug": "timer", "name": "倒计时器", "icon": "⏱️", "category": "时间", "description": "…" }
  ],
  "updatedAt": "2026-10-02T23:01:38.59664+08:00"
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `data[].slug` | string | 工具英文短名（唯一键） |
| `data[].category` | string | 分类（前端映射为筛选 tag） |
| `data[].description` | string | 一句话简介（前端映射为 desc） |
| `updatedAt` | string\|null | 已上线工具最近一次更新时间（余力加练：首页「最后更新时间」） |

> 前端落地页 url 由 `slug → TOOL_PAGES` 映射得出，接口不返回 url。

## 5. 下一步（Day 19–20）

- [x] 真实业务接口（Day 17 hot/favorites、Day 20 tools）
- [x] 数据库建表（Day 16）
- [x] 跨域细粒度配置（Day 20：网关统一处理，云函数不自带 CORS 头）
- [ ] 正式域名（去测试域名提示页）

## 6. 测试域名提示页说明

测试域名 `*.service.tcloudbase.com` 首次访问会弹出腾讯云的「测试域名」安全提示页，需点「确定访问」才展示内容。这是**测试域名的正常行为**，正式域名（绑定自定义域名后）不会有此提示。
