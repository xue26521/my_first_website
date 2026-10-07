#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_hot.py —— 拉取真实热搜并写入 hot 表（Day 17 同步任务）

用法：
    python scripts/sync_hot.py

流程：
    1. 从主源 60s.viki.moe/v2/weibo 拉取微博热搜
    2. 主源失败则切备用源 v2.xxapi.cn/api/weibohot（对应附录 F 降级策略）
    3. 解析出 title / hot_value / url / source
    4. 先 TRUNCATE hot 表，再批量 INSERT（幂等，每次执行结果一致）
"""
import json
import re
import subprocess
import sys
import urllib.request

# CloudBase 配置
ENV_ID = "mywebsite-d7gwnykd4faa93718"
TCB = r"C:/Users/雪泽/.workbuddy/binaries/node/versions/22.22.2-6/tcb.cmd"

# 热搜源（主 -> 备）
SOURCES = [
    {
        "name": "60s",
        "url": "https://60s.viki.moe/v2/weibo",
        "parse": lambda d: [
            (it["title"], int(it["hot_value"]), it.get("link", ""))
            for it in d.get("data", [])
        ],
    },
    {
        "name": "xxapi",
        "url": "https://v2.xxapi.cn/api/weibohot",
        "parse": lambda d: [
            (it["title"], int(str(it.get("hot", "0")).replace("万", "0000").replace("亿", "00000000")), it.get("url", ""))
            for it in d.get("data", [])
        ],
    },
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_sql(sql):
    r = subprocess.run(
        [TCB, "db", "execute", "-e", ENV_ID, "--sql", sql],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    out = r.stdout + r.stderr
    if re.search(r"Error|ERROR|error:", out):
        raise RuntimeError(out.strip()[:300])
    return out


def escape(s):
    """把字符串转义为 SQL 单引号字面量，防注入/防引号破坏。"""
    return "'" + str(s).replace("'", "''") + "'"


def main():
    items = None
    used_source = None
    for src in SOURCES:
        try:
            data = fetch(src["url"])
            items = src["parse"](data)
            if items:
                used_source = src["name"]
                break
        except Exception as e:
            print(f"[sync_hot] 源 {src['name']} 失败：{e}", file=sys.stderr)

    if not items:
        print("[sync_hot] 所有热搜源都不可用，任务失败", file=sys.stderr)
        sys.exit(1)

    # 取前 20 条入库（够展示 + 演示）
    items = items[:20]
    print(f"[sync_hot] 使用源 {used_source}，共 {len(items)} 条")

    # 幂等：先清空 hot 表再插入
    run_sql("TRUNCATE hot RESTART IDENTITY")

    # 批量 INSERT（单条 SQL，多条 VALUES；注意必须压成单行，
    # 因为 tcb db execute 不支持多行 SQL，换行会被截断）
    rows = ",".join(
        f"({escape(t)}, {hv}, {escape(u)}, 'weibo')"
        for t, hv, u in items
    )
    sql = f"INSERT INTO hot (title, hot_value, url, source) VALUES {rows}"
    run_sql(sql)
    print(f"[sync_hot] 已写入 hot 表 {len(items)} 行")


if __name__ == "__main__":
    main()
