# 架构分层说明（ARCHITECTURE.md）

> Day 19 重构产物：把「查数据库」从云函数路由层抽到独立的数据访问层（DAO）。

## 分层示意图

```
┌─────────────────────────────────────────────────────┐
│  前端（HTML/JS）                                    │
│  index.html / js/*.js                               │
│  只调用接口，不关心数据怎么来的                       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP 请求（GET/POST）
┌───────────────────────▼─────────────────────────────┐
│  HTTP 路由层（云函数 index.js）                      │
│  health / hot / favorites                           │
│  职责：接请求 → 校验参数 → 调 DAO → 回响应            │
│  不关心：数据存在哪、怎么查                          │
└───────────────────────┬─────────────────────────────┘
                        │ require("./db")
┌───────────────────────▼─────────────────────────────┐
│  数据访问层 DAO（db.js + db-client.js）              │
│  职责：拼查询 → fetch REST 网关 → 返回数据            │
│  不关心：请求怎么进来、响应怎么出去                    │
└───────────────────────┬─────────────────────────────┘
                        │ REST 网关（PostgREST）
┌───────────────────────▼─────────────────────────────┐
│  数据库 PostgreSQL（tools / hot / favorites / ...）   │
└─────────────────────────────────────────────────────┘
```

## 「查数据库」代码从哪移到了哪？

**从**：云函数 `index.js`（HTTP 路由层）里的内联 `fetch(...REST 网关...)` 代码

**到**：`cloudfunctions/<fn>/db.js`（数据访问层 DAO）

具体迁移对照：

| 函数 | 原位置（index.js） | 新位置（db.js） |
|---|---|---|
| hot | `handleGet` 里的 `fetch hot` | `listHot(limit)` |
| favorites | `toolExists` / `alreadyFavorited` / `insertFavorite` / `handleGet` 里 4 段 fetch | `toolExists` / `alreadyFavorited` / `insertFavorite` / `listFavorites` |

## 为什么要分层？

1. **单一职责**：路由层只管 HTTP 进出，DAO 层只管数据存取，各司其职。
2. **易复用**：同一个查询被多处用到时，不用复制粘贴 fetch 代码，调 DAO 方法即可。
3. **易替换**：以后数据库从 REST 网关换成 pg 直连，只需改 DAO 层，路由层一行不用动。
4. **易测试**：可以单独 mock DAO，不用起 HTTP 服务就能测路由逻辑。

## 文件说明

- `shared/db-client.js` —— 通用数据库客户端（源模板），封装了 REST 网关鉴权和 query/insert。
- `cloudfunctions/<fn>/db-client.js` —— 从 shared 复制的副本（云函数部署时只打包各自目录，所以需要复制）。
- `cloudfunctions/<fn>/db.js` —— 各函数专属的 DAO，用 db-client 封装具体业务查询。

> ⚠️ 修改 `shared/db-client.js` 后，需手动同步复制到 `cloudfunctions/*/db-client.js`。
