-- =====================================================================
-- 效率小工具箱 · Day 17 种子数据
-- 环境：CloudBase PostgreSQL 17.11
-- favorites 收藏表种子：预置 3 条收藏（关联已有工具）
-- 幂等：先 TRUNCATE 再插入，重复执行结果一致。
-- =====================================================================

TRUNCATE favorites RESTART IDENTITY;

INSERT INTO favorites (tool_id)
SELECT id FROM tools WHERE slug IN ('timer', 'password', 'converter');
