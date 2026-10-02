-- =====================================================================
-- 效率小工具箱 · 数据库建表脚本
-- Day 16 产出 | 环境：CloudBase PostgreSQL 17.11
-- 两张表：tools（工具表）+ tool_usage（使用记录表）
-- 关联：tool_usage.tool_id 外键 -> tools.id（一对多）
-- =====================================================================

-- ---------------------------------------------------------------------
-- 表 1：tools —— 工具表（静态字典，存每个工具的元信息）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tools (
    -- 主键：自增整数。工具数量少、增长慢，用整数主键最直观、最快。
    id           SERIAL PRIMARY KEY,

    -- 工具唯一标识（英文短名），例如 timer / converter / password。
    -- 用 slug 而不是中文名当唯一键，便于前端路由和代码里引用，不受文案改动影响。
    slug         VARCHAR(64)  NOT NULL UNIQUE,

    -- 工具中文名，给用户看。
    name         VARCHAR(64)  NOT NULL,

    -- 工具图标（emoji），存字符串即可，前端直接渲染。
    icon         VARCHAR(16)  NOT NULL DEFAULT '🧰',

    -- 分类，用于首页筛选（如 时间 / 换算 / 安全）。
    -- 用 VARCHAR 而非 ENUM：分类将来可能增改，VARCHAR 更灵活，无需改表结构。
    category     VARCHAR(32)  NOT NULL DEFAULT '其他',

    -- 一句话简介。
    description  TEXT         NOT NULL DEFAULT '',

    -- 排序权重：数字越小越靠前。用 SMALLINT 足够（工具数量不可能超 3 万）。
    sort_order   SMALLINT     NOT NULL DEFAULT 0,

    -- 是否上线：布尔值。未上线工具前端不展示，但仍保留在库里。
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,

    -- 创建/更新时间：TIMESTAMPTZ（带时区），比 TIMESTAMP 更能避免时区歧义。
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 常用查询：首页按 sort_order 排序 + 只看上线工具，所以给这两列建索引。
CREATE INDEX IF NOT EXISTS idx_tools_sort_order ON tools (sort_order);
CREATE INDEX IF NOT EXISTS idx_tools_active      ON tools (is_active);

-- ---------------------------------------------------------------------
-- 表 2：tool_usage —— 使用记录表（动态流水，每次使用工具记一行）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_usage (
    -- 主键：自增整数。记录量可能很大，用 BIGSERIAL（64 位）防溢出。
    id           BIGSERIAL PRIMARY KEY,

    -- 外键：指向 tools.id，表示「这次是用了哪个工具」。
    -- 用 INTEGER 与 tools.id 类型一致，保证外键类型匹配。
    -- ON DELETE CASCADE：工具被删除时，其使用记录一并删除，不留孤儿数据。
    tool_id      INTEGER      NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

    -- 使用动作类型（如 open / copy / convert / start）。
    -- 用 VARCHAR 而非 ENUM：动作类型可能扩展，VARCHAR 更灵活。
    action       VARCHAR(32)  NOT NULL DEFAULT 'open',

    -- 使用时间：带时区时间戳，记录这次操作发生的时刻。
    used_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- 备注（可选）：例如「换算 3.5 英寸 -> 8.89 厘米」这类上下文。
    detail       TEXT
);

-- 高频查询：按工具统计、按时间范围筛选，所以给外键和时间建索引。
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id ON tool_usage (tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_used_at ON tool_usage (used_at);

-- ---------------------------------------------------------------------
-- 字段类型选型小结（余力加练：每个字段为什么这么选）
-- ---------------------------------------------------------------------
-- id        SERIAL/BIGSERIAL  自增主键，DB 代管，无需应用层生成，安全无冲突
-- slug      VARCHAR + UNIQUE  英文短名做唯一键，路由友好，不受中文文案影响
-- name/icon/category/action   VARCHAR  短文本，长度可控，便于索引与校验
-- description/detail          TEXT     长文本，无固定长度，避免超长截断
-- sort_order                  SMALLINT 排序值，量级小，省空间
-- is_active                   BOOLEAN  状态开关，语义清晰，省去 0/1 魔法数字
-- created_at/updated_at/used_at TIMESTAMPTZ  带时区时间戳，避免跨时区歧义
-- tool_id                     INTEGER(外键) 与 tools.id 类型严格一致，保证关联成立
-- =====================================================================
