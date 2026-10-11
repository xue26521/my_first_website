# 效率小工具箱

一个 30 天前端学习项目，从零搭建的在线工具集：密码生成器、倒计时器、单位换算器、中英翻译、今日热搜、工具收藏。

## 技术栈

- **前端**：原生 HTML/CSS/JS（hash 路由，无框架）
- **后端**：CloudBase HTTP 云函数（Node.js）
- **数据库**：CloudBase PostgreSQL（经 REST 网关读写）
- **托管**：CloudBase 静态托管

## 目录结构

```
my-first-website/
├── index.html          首页（工具列表 + 热搜）
├── password.html       密码生成器
├── timer.html          倒计时器
├── converter.html      单位换算器
├── translate.html      中英翻译
├── css/                样式
├── js/                 前端逻辑与本地数据
├── cloudfunctions/     云函数（hot / tools / favorites / health）
├── shared/             共享数据访问层
├── scripts/            同步热搜、部署云函数等脚本
├── db/                 数据库 Schema 与种子数据
└── .workbuddy/skills/  AI 协作 Skill（见下）
```

## 发布前检查（pre-release-check Skill）

在 `git push` 或部署公网之前，先跑一遍发布前检查，揪出「不该提交的东西」（密钥泄露、网关地址硬编码、临时部署文件等）：

```bash
# 项目根目录下执行（Windows）
python .workbuddy/skills/pre-release-check/check.py
```

脚本会逐项输出 `通过 / 未通过`，并给出总判定：

- `✅ 可以发布` —— 无致命隐患（退出码 0）
- `❌ 禁止发布` —— 存在 P0 隐患，先修复（退出码 1）

### 检查项一览

| 级别 | 检查项 |
|---|---|
| P0 致命 | 密钥/令牌泄露、`.env` 被 git 跟踪、临时部署文件残留 |
| P1 严重 | 公网网关地址硬编码、明文 http 链接 |
| P2 提示 | 调试日志打印敏感字段 |

### 关于这个 Skill 的由来

这是 Day 25 的产出：一个「可复用的发布前检查 Skill」。它不是为了证明项目没问题，而是**能真的查出问题**——当天我用一个故意埋的密钥泄露样本验证了它不会虚报通过，抓出隐患后即删除样本，让项目恢复干净再提交。
