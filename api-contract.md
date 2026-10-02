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
3. **跨域**：响应头已带 `Access-Control-Allow-Origin: *`，前端可直接 fetch，无需额外配置（跨域配置正式版 Day 20 收尾）。
4. **字段命名**：小驼峰（camelCase），如 `envId`、`createTime`。

## 4. 下一步（Day 16–20）

- [ ] 真实业务接口（工具数据、用户数据）
- [ ] 数据库建表
- [ ] 跨域细粒度配置
- [ ] 正式域名（去测试域名提示页）

## 5. 测试域名提示页说明

测试域名 `*.service.tcloudbase.com` 首次访问会弹出腾讯云的「测试域名」安全提示页，需点「确定访问」才展示内容。这是**测试域名的正常行为**，正式域名（绑定自定义域名后）不会有此提示。
