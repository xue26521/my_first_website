#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deploy_functions.py —— 部署 hot / favorites 两个 HTTP 云函数（Day 17）

关键点：
1. 读取 .env 里的 CLOUDBASE_API_KEY（service_role API Key，敏感，不入库）
2. 生成临时 cloudbaserc.deploy.json，把 API Key 注入到两个函数的 envVariables
3. 用 tcb fn deploy 部署（HTTP 类型 + 访问路径）
4. 部署后删除临时配置文件，避免密钥残留

用法：
    python scripts/deploy_functions.py
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TCB = r"C:/Users/雪泽/.workbuddy/binaries/node/versions/22.22.2-3/tcb.cmd"


def load_env():
    env = {}
    env_path = os.path.join(ROOT, ".env")
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def main():
    env = load_env()
    api_key = env.get("CLOUDBASE_API_KEY", "")
    env_id = env.get("ENV_ID", "mywebsite-d7gwnykd4faa93718")
    if not api_key:
        print("[deploy] 错误：.env 里没有 CLOUDBASE_API_KEY", file=sys.stderr)
        sys.exit(1)

    # 生成临时配置（含真实 API Key）
    tmp_config = os.path.join(ROOT, "cloudbaserc.deploy.json")
    config = {
        "envId": env_id,
        "functions": [
            {
                "name": "hot",
                "timeout": 30,
                "runtime": "Nodejs20.19",
                "memorySize": 256,
                "installDependency": False,
                "dir": "cloudfunctions/hot",
                "envVariables": {
                    "ENV_ID": env_id,
                    "CLOUDBASE_API_KEY": api_key,
                },
            },
            {
                "name": "favorites",
                "timeout": 30,
                "runtime": "Nodejs20.19",
                "memorySize": 256,
                "installDependency": False,
                "dir": "cloudfunctions/favorites",
                "envVariables": {
                    "ENV_ID": env_id,
                    "CLOUDBASE_API_KEY": api_key,
                },
            },
        ],
    }
    with open(tmp_config, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    # 部署两个函数
    try:
        for fn_name, path in [("hot", "/api/hot"), ("favorites", "/api/favorites")]:
            print(f"[deploy] 部署 {fn_name} ...")
            # 用临时配置文件 + --httpFn + --path 部署
            cmd = [
                TCB, "fn", "deploy", fn_name,
                "--config-file", tmp_config,
                "--httpFn",
                "--path", path,
                "--force",
            ]
            r = subprocess.run(cmd, cwd=ROOT, capture_output=True,
                               text=True, encoding="utf-8", errors="replace")
            out = r.stdout + r.stderr
            # 判断是否成功
            if "Deployment completed" in out or "部署成功" in out or "success" in out.lower():
                print(f"[deploy] {fn_name} 部署成功")
            else:
                # 打印关键信息
                tail = out[-800:]
                print(f"[deploy] {fn_name} 输出：\n{tail}")
    finally:
        # 清理临时配置文件（不残留密钥）
        if os.path.exists(tmp_config):
            os.remove(tmp_config)
            print("[deploy] 已清理临时配置文件")


if __name__ == "__main__":
    main()
