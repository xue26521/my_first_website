-- =====================================================================
-- 效率小工具箱 · Day 17 新增表
-- 环境：CloudBase PostgreSQL 17.11
-- 新增两张表：
--   hot       —— 热搜快照表（存从外部热搜源拉到的真实热搜数据）
--   favorites —— 收藏表（存用户收藏的工具，外键关联 tools.id）
-- 与 Day 16 的 tools / tool_usage 并存（保留旧表）。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 表 3：hot —— 热搜快照表（外部真实热搜数据落库）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hot (
    -- 主键：自增整数。热搜条目每次同步会清空重灌，量级小，用 SERIAL 足够。
    id         SERIAL PRIMARY KEY,

    -- 热搜标题。
    title      VARCHAR(256) NOT NULL,

    -- 热度值（数字，方便排序）。用 BIGINT 容纳「万级」以上的热度数值。
    hot_value  BIGINT       NOT NULL DEFAULT 0,

    -- 原文链接（微博/新闻链接）。
    url        TEXT,

    -- 来源平台（如 weibo），便于区分不同热搜源。
    source     VARCHAR(32)  NOT NULL DEFAULT 'weibo',

    -- 抓取时间：带时区，记录这批热搜是什么时候同步进来的。
    fetched_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 高频查询：按热度倒序取 Top N，所以给热度值建索引。
CREATE INDEX IF NOT EXISTS idx_hot_hot_value ON hot (hot_value DESC);

-- ---------------------------------------------------------------------
-- 表 4：favorites —— 收藏表（用户收藏的工具）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    -- 主键：自增整数。
    id         SERIAL PRIMARY KEY,

    -- 外键：指向 tools.id，表示「收藏了哪个工具」。
    -- 与 tools.id 类型一致（INTEGER）。
    tool_id    INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

    -- 收藏时间：带时区。
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 高频查询：按工具查收藏、按时间排序，给外键建索引。
CREATE INDEX IF NOT EXISTS idx_favorites_tool_id ON favorites (tool_id);

-- Day 18 追加：防重复收藏 —— 同一工具只能收藏一次。
-- 通过 tool_id 唯一约束，重复提交由数据库层直接拒绝（配合 ON CONFLICT DO NOTHING）。
CREATE UNIQUE INDEX IF NOT EXISTS favorites_tool_id_unique ON favorites (tool_id);

-- =====================================================================
-- 说明：
--   hot 表存外部真实热搜（接 60s.viki.moe / xxapi 微博热搜源）。
--   favorites 表存收藏的工具（Day 18 写接口才写入，今天先建表 + 种子）。
-- =====================================================================
