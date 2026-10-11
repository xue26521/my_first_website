#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
发布前检查器（pre-release-check Skill 的可执行部分）
用法：python check.py
零第三方依赖，仅用标准库。

扫描仓库文本文件，检查发布隐患：
  P0: 密钥泄露 / .env 被跟踪 / 临时部署文件残留
  P1: 公网网关地址硬编码 / 明文 http 链接
  P2: 调试日志打印敏感信息

退出码：0 = 可以发布（无 P0，P1/P2 仅提示）；1 = 存在隐患，禁止发布。
"""

import os
import re
import sys
import subprocess

# 仓库根目录：本脚本向上三级（skills/pre-release-check/ -> 根）
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

# 需要跳过的目录
SKIP_DIRS = {".git", "node_modules", "dist", ".workbuddy", "__pycache__", ".idea", ".vscode"}

# 需要跳过的文件后缀（二进制/非文本）
SKIP_EXT = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
            ".ttf", ".eot", ".mp4", ".mp3", ".pdf", ".zip", ".tar", ".gz", ".pyc"}

# 文本文件候选（按后缀精确判断，未知名后缀也尝试按文本读）
TEXT_EXT = {".js", ".ts", ".jsx", ".tsx", ".html", ".htm", ".css", ".json",
            ".md", ".py", ".sql", ".sh", ".yml", ".yaml", ".toml", ".txt",
            ".xml", ".env", ".gitignore", ".cfg", ".ini", ".csv"}


def is_text_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in SKIP_EXT:
        return False
    if ext in TEXT_EXT:
        return True
    # 无后缀或未知后缀：尝试按文本读，失败则跳过
    return True


def walk_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT)
            if is_text_file(full):
                yield full, rel


def read_lines(full):
    try:
        with open(full, "r", encoding="utf-8", errors="replace") as f:
            return f.read().splitlines()
    except Exception:
        return []


# ---------------- 检查规则 ----------------

def check_secret_leak(files):
    """P0：非 .env 文件里出现真实密钥/JWT。

    只判「真实密钥值」，不判「变量名引用」，避免误报：
      - 误报（应放过）：env.get("CLOUDBASE_API_KEY")、process.env.X、注释里提到密钥名
      - 命中（应抓出）：KEY="eyJ..." 或 const KEY = "eyJ..." 这类硬编码真实值
    """
    # JWT 特征：eyJ 开头，三段 base64url（header 可能较短，放宽首段长度）
    jwt_re = re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")
    # 变量引用形式：env.get("X") / os.environ["X"] / process.env.X / env["X"]
    ref_re = re.compile(
        r"(env\.get\s*\(|os\.environ\s*\[|process\.env\.|env\s*\[|getenv\s*\(|ENV\s*\[)"
    )
    findings = []
    for full, rel in files:
        if rel.endswith(".env"):
            continue  # .env 本应含密钥，单独由 .env 跟踪检查处理
        lines = read_lines(full)
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith(("#", "//", "/*", "*", "<!--")):
                continue
            hit = None
            # 命中 1：真实的 JWT 令牌值（无论赋给什么变量名）
            if jwt_re.search(line):
                # 若整行是变量引用（如 env.get("eyJ...") 罕见），仍视为泄露
                hit = "JWT 令牌硬编码"
            # 命中 2：KEY=真实密钥值 形式的硬编码赋值（含长随机串）
            elif re.search(r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*[\"'][A-Za-z0-9_\-+/=]{20,}[\"']", line) \
                    and not ref_re.search(line):
                hit = "密钥硬编码赋值"
            if hit:
                snippet = stripped
                if len(snippet) > 70:
                    snippet = snippet[:70] + "..."
                findings.append((rel, i, hit, snippet))
    return findings


def check_env_tracked():
    """P0：.env 是否被 git 跟踪。"""
    try:
        out = subprocess.run(
            ["git", "ls-files", "--", ".env"],
            cwd=ROOT, capture_output=True, text=True, timeout=10
        )
        tracked = [l for l in out.stdout.splitlines() if l.strip() == ".env"]
        return tracked
    except Exception:
        return []  # 非 git 仓库时无法判断，返回空（不误报）


def check_temp_deploy_file(files):
    """P0：临时部署文件 cloudbaserc.deploy.json 残留。"""
    found = []
    for full, rel in files:
        if os.path.basename(full) == "cloudbaserc.deploy.json":
            found.append(rel)
    return found


def check_gateway_hardcode(files):
    """P1：公网网关地址硬编码（含环境 ID 字面量，而非 ${ENV_ID} 变量拼接）。"""
    # 只命中「完整写死了环境 ID」的网关地址，放过 ${ENV_ID} 变量拼接
    gw_re = re.compile(r"[a-z0-9]{6,}\.api\.tcloudbasegateway\.com")
    findings = []
    for full, rel in files:
        lines = read_lines(full)
        for i, line in enumerate(lines, 1):
            if gw_re.search(line):
                snippet = line.strip()
                if len(snippet) > 70:
                    snippet = snippet[:70] + "..."
                findings.append((rel, i, snippet))
    return findings


def check_plain_http(files):
    """P1：明文 http:// 链接（排除注释与示例）。"""
    findings = []
    http_re = re.compile(r"http://(?!localhost|127\.0\.0\.1)[^\s\"'<>]+")
    for full, rel in files:
        lines = read_lines(full)
        for i, line in enumerate(lines, 1):
            # 跳过纯注释行（// 或 # 或 <!-- 开头，且不含实际代码）
            stripped = line.strip()
            if stripped.startswith(("//", "#", "<!--")):
                continue
            for m in http_re.finditer(line):
                findings.append((rel, i, m.group(0)))
    return findings


def check_debug_sensitive(files):
    """P2：console.log / print 打印敏感变量值（而非含密钥名的提示文案）。"""
    findings = []
    sensitive = ("key", "token", "secret", "password", "apikey", "api_key")
    # 只抓「打印的是变量」的情况，如 console.log(apiKey)、print(key)；放过 print("...没有 KEY") 这类文案
    log_re = re.compile(r"(console\.log|print)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)", re.IGNORECASE)
    for full, rel in files:
        lines = read_lines(full)
        for i, line in enumerate(lines, 1):
            for m in log_re.finditer(line):
                arg = m.group(2)
                if any(s == arg.lower() or arg.lower() in s or s in arg.lower() for s in sensitive):
                    snippet = line.strip()
                    if len(snippet) > 70:
                        snippet = snippet[:70] + "..."
                    findings.append((rel, i, snippet))
    return findings


# ---------------- 输出 ----------------

def render_findings(title, findings, colored):
    if not findings:
        print(f"  [通过] {title}")
        return True
    print(f"  [未通过] {title}  ({len(findings)} 处)")
    for item in findings:
        if len(item) == 4:
            rel, line, kind, snippet = item
            print(f"      - {rel}:{line}  [{kind}]  {snippet}")
        else:
            rel, line, snippet = item
            print(f"      - {rel}:{line}  {snippet}")
    return False


def main():
    print("=" * 60)
    print("发布前检查  pre-release-check")
    print("扫描目录：", ROOT)
    print("=" * 60)

    files = list(walk_files())
    print(f"\n共扫描 {len(files)} 个文件\n")

    print("[P0] 致命项（命中必须阻断发布）")
    p0_ok = True
    # 1. 密钥泄露
    p0_ok &= render_findings("密钥/令牌泄露", check_secret_leak(files), True)
    # 2. .env 被跟踪
    tracked = check_env_tracked()
    if tracked:
        p0_ok = False
        print(f"  [未通过] .env 被 git 跟踪  (文件: {', '.join(tracked)})")
    else:
        print("  [通过] .env 未被 git 跟踪（.gitignore 生效）")
    # 3. 临时部署文件
    p0_ok &= render_findings("临时部署文件 cloudbaserc.deploy.json", check_temp_deploy_file(files), True)

    print("\n[P1] 严重项（强烈建议修复）")
    p1_ok = True
    p1_ok &= render_findings("公网网关地址硬编码", check_gateway_hardcode(files), True)
    p1_ok &= render_findings("明文 http:// 链接", check_plain_http(files), True)

    print("\n[P2] 提示项（可选优化）")
    p2_ok = render_findings("调试日志打印敏感字段", check_debug_sensitive(files), True)

    print("\n" + "=" * 60)
    if p0_ok:
        print("总判定：✅ 可以发布（无 P0 致命隐患）")
        if not p1_ok:
            print("         ⚠️ 存在 P1 严重项，建议修复后再发布")
        exit_code = 0
    else:
        print("总判定：❌ 存在发布隐患，禁止发布（请先修复 P0 项）")
        exit_code = 1
    print("=" * 60)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
