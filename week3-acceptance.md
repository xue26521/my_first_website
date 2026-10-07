# Day 21｜第 3 周验收表：云端数据服务 v1

> 验收日期：2026-10-07　|　状态取值：PASS（已完成，有证据）/ FAIL（缺项，如实标记）/ 未执行（本周未做）
> 规则：每项必须写「怎么验证」，禁止「基本完成」这类模糊表述。

## 一、周验收表（逐项证据）

| # | 验收项 | 状态 | 怎么验证 / 证据 |
|---|---|---|---|
| 1 | 数据库建表脚本可重复执行 | ✅ PASS | `db/schema.sql` + `db/seed.sql` 幂等（`IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `TRUNCATE`）；表 tools / tool_usage / hot / favorites 已在库 |
| 2 | GET 读接口公网返回真实数据 | ✅ PASS | `GET /api/tools` 返回 3 个工具、`GET /api/hot` 返回 20 条热搜、`GET /api/favorites` 返回 5 条收藏，均 `ok:true`（今日 curl 实测） |
| 3 | POST 写接口可写入并读回 | ✅ PASS | `POST /api/favorites` 三重防护实测：缺 toolId→400、toolId=999→400「不存在」、toolId=1→409「重复」；写链路真实连库判断 |
| 4 | 数据库操作分层重构 | ✅ PASS | Day 19：数据库操作从 `index.js` 抽到 `db.js`（DAO 层）+ `db-client.js`（REST 网关封装），见 `ARCHITECTURE.md` |
| 5 | 前端从 mock 切到真实接口 | ✅ PASS | `js/tools-data.js` 的 `fetchTools` 从返回 `MOCK_TOOLS` 改为 `fetch(API_BASE + "/api/tools")`，字段映射 category→tag、description→desc |
| 6 | 公网检查台可访问 | ✅ PASS | 静态托管首页 `https://mywebsite-d7gwnykd4faa93718-1499683859.tcloudbaseapp.com/` 返回 HTTP 200，展示数据库真实数据 |
| 7 | 跨域配置正确（浏览器可用） | ✅ PASS | Day 20 修复「ACAO 双值」：云函数删除自带 CORS 头，网关统一处理，三接口实测单值 `Access-Control-Allow-Origin: <origin>` |
| 8 | 健康接口 /api/health 返回 ok | ⚠️ 需复测 | 函数已部署（`Deployment completed`）、代码正确、Day 15–19 历史验证通过；今日 curl 空返回与 `fn invoke` 网络超时同因（代理故障），待网络恢复复测 |

> ⚠️ 说明：第 8 项「health 今日 curl 空返回」经排查是**本机代理网络故障**（同一时刻 `git ls-remote` 报 Empty reply、`fn invoke` 报 `network timeout at scf.tencentcloudapi.com`），非函数/部署问题。核心三接口（tools/hot/favorites）同一时刻 curl 全部正常返回，可佐证。已如实标记「需复测」，不模糊表述为 PASS。

## 二、本周时间投入回顾（今日一问）

**「这周最花时间的是哪一步？你觉得值吗？」**

最花时间的是 **Day 20 的跨域排查**（前后跨了两天、两个 commit）。

- 第一天：新增 `/api/tools` 接口 → 遇到 `INVALID_PATH` → 发现是路由 `upstreamResourceType` 配错（SCF vs WEB_SCF）→ 修好，curl 全绿。
- 第二天：你发截图，浏览器却报 `Failed to fetch` → 才发现 `Access-Control-Allow-Origin` 被网关和云函数叠加成了 `<origin>,*` 双值 → 移除云函数自带 CORS 头才真正修好。

**值，非常值。** 因为这一步逼我搞清了一个关键认知：**curl 不等于浏览器**。curl 不校验 CORS，所以「后端测通了」和「用户能看到」之间还隔着一层浏览器规范。这个坑只有真实浏览器会暴露，是「开发者自己看不见、只有换视角才暴露」的典型——和第 2 周「返回链接文案不一致」的盲区是同一类，但这次更隐蔽、更技术。

## 三、缺项与遗留（记录到下周）

- health 今日复测待网络恢复（见验收项 8）
- 无「顺手修复与验收无关问题」的动作（遵守「今日不做」）
