#!/usr/bin/env python3
"""
Skill 排行榜数据爬取脚本 (第一期：GitHub 渠道)

功能:
    通过 GitHub Search API 抓取 topic:agent-skills 下 star 数最高的前 100 个仓库，
    清洗为统一的 Skill 结构并输出到前端静态 JSON。

零第三方依赖:
    仅使用 Python 标准库 (urllib.request / json / datetime / os / re)。
    注意：本环境受管 Python 未安装 requests / beautifulsoup4，请勿引入第三方库。

运行:
    python scripts/crawl_skills.py

环境变量:
    GITHUB_TOKEN  (可选) GitHub Personal Access Token，用于提升 API 限速。
                          匿名调用 search API 限速 10 次/分钟，单次调用足够；
                          配置 Token 后可获得更高限额 (5000 次/小时)。

定时爬取 (cron 示例，每日凌晨 4 点):
    0 4 * * * cd /path/to/fastapi && /usr/bin/python scripts/crawl_skills.py >> /var/log/skill-ranking.log 2>&1

输出:
    web/default/public/skills-ranking.json
"""

import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List

# ---------------------------------------------------------------------------
# 可插拔渠道架构
# ---------------------------------------------------------------------------
# 每个渠道实现为独立的 crawl_xxx() 函数，返回 List[Dict]（每条为统一 Skill 结构，
# 不含 rank 字段）。main() 负责聚合、去重、排名与写出。
# 未来新增 openclaw / skillhuyb 等渠道，只需新增 crawl_xxx() 并在 main() 中聚合，
# 无需改动既有逻辑。


# GitHub Search API：按 star 降序取前 100 个 topic:agent-skills 仓库
GITHUB_SEARCH_URL = (
    "https://api.github.com/search/repositories"
    "?q=topic:agent-skills&sort=stars&order=desc&per_page=100"
)

# 分类关键词映射规则（按优先级，命中第一个即返回）。
# 采用词边界正则 (\b) 以减少 "email"->ai / "latest"->test / "html"->ml / "docker"->doc
# 等子串误匹配；同时支持常见复数/派生形态 (docs?, apis?, bots?, tests?, agent(s)?,
# scrap\w*, deploy\w*, search(es)?)。
_CATEGORY_RULES: List[tuple] = [
    (r"\bsecurity\b", "安全"),
    (r"\bweb\b", "工具"),
    (r"\bcli\b", "工具"),
    (r"\bapis?\b", "工具"),
    (r"\b(?:database|sql)\b", "数据"),
    (r"\bbots?\b", "通信"),
    (r"\bsearch(?:es)?\b", "搜索"),
    (r"\bscrap\w*\b", "工具"),
    (r"\btests?\b", "测试"),
    (r"\bdocs?\b", "文档"),
    (r"\bdeploy\w*\b", "部署"),
    (r"\b(?:ai|ml|llm)\b", "AI增强"),
    (r"\bagent(?:s)?\b", "AI"),
]


def _format_users(count: int) -> str:
    """将 star 数格式化为友好字符串，如 1234->1.2k, 123456->123.5k, 1234567->1.2M。"""
    count = max(0, int(count))
    if count < 1000:
        return str(count)
    if count < 1_000_000:
        val = count / 1000.0
        text = f"{val:.1f}"
        if text.endswith(".0"):
            text = text[:-2]
        return text + "k"
    val = count / 1_000_000.0
    text = f"{val:.1f}"
    if text.endswith(".0"):
        text = text[:-2]
    return text + "M"


def _map_category(topics: List[str], description: str) -> str:
    """根据 topics 与 description 小写文本，按规则匹配第一个命中的中文类别。"""
    text = " ".join(topics).lower() + " " + (description or "").lower()
    for pattern, category in _CATEGORY_RULES:
        if re.search(pattern, text):
            return category
    return "AI"


def _map_trend(pushed_at: str) -> str:
    """根据最近推送时间判断趋势：距今天 <=30 天为 up，否则 stable。"""
    try:
        pushed = datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))
    except Exception:
        return "stable"
    if pushed.tzinfo is None:
        pushed = pushed.replace(tzinfo=timezone.utc)
    delta_days = (datetime.now(timezone.utc) - pushed).days
    return "up" if delta_days <= 30 else "stable"


def _repo_to_skill(repo: Dict) -> Dict:
    """将单个 GitHub repo 映射为统一 Skill 结构（不含 rank）。"""
    # 空描述兜底为「暂无描述」，确保 8 个字段全部非空（满足验收标准）
    description = (repo.get("description") or "").strip()
    if not description:
        description = "暂无描述"
    elif len(description) > 200:
        description = description[:200]
    topics = repo.get("topics") or []
    return {
        "name": repo.get("full_name", ""),
        "description": description,
        "category": _map_category(topics, description),
        "users": _format_users(repo.get("stargazers_count", 0)),
        "source": "github",
        "trend": _map_trend(repo.get("pushed_at", "")),
        "url": repo.get("html_url", ""),
    }


def crawl_github() -> List[Dict]:
    """爬取 GitHub 上 topic:agent-skills 的 Top 100 仓库。失败时返回空列表。"""
    print("正在从 GitHub 爬取 AI Agent skills (topic:agent-skills)...")
    token = os.environ.get("GITHUB_TOKEN")
    headers = {
        "User-Agent": "skill-ranking-crawler",
        "Accept": "application/vnd.github+json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(GITHUB_SEARCH_URL, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
        payload = json.loads(raw)
    except urllib.error.HTTPError as exc:
        print(f"  GitHub API 返回错误: {exc.code} {exc.reason}")
        if exc.code == 403:
            print("  可能是触发了匿名限速 (10 次/分钟)，建议设置 GITHUB_TOKEN 后重试。")
        return []
    except urllib.error.URLError as exc:
        print(f"  GitHub 网络不可达: {exc.reason}")
        return []
    except Exception as exc:  # noqa: BLE001 - 兜底，避免进程崩溃
        print(f"  GitHub 爬取失败: {exc}")
        return []

    items = payload.get("items", [])[:100]
    skills = [_repo_to_skill(repo) for repo in items]
    print(f"  GitHub 爬取完成，获取 {len(skills)} 个 Skill")
    return skills


# ---------------------------------------------------------------------------
# 兜底种子数据（仅当 GitHub 不可用时使用，避免空数据）
# ---------------------------------------------------------------------------
SEED_SKILLS: List[Dict] = [
    {"name": "Skill Vetter", "description": "技能安全审计工具，检测恶意 Skill，保障使用安全", "category": "安全", "users": "256k", "source": "clawhub", "trend": "up", "url": ""},
    {"name": "find-skills", "description": "智能发现和安装专业 Agent 技能，生态搜索入口", "category": "工具", "users": "251.5k", "source": "claude", "trend": "up", "url": ""},
    {"name": "GitHub", "description": "完整的 GitHub 集成，创建 Issue、审查 PR、查看 CI/CD 状态", "category": "开发", "users": "189k", "source": "clawhub", "trend": "stable", "url": ""},
    {"name": "Ontology Memory", "description": "本体记忆系统，显著提升 Agent 长期记忆与上下文理解能力", "category": "AI增强", "users": "188k", "source": "clawhub", "trend": "up", "url": ""},
    {"name": "Google Workspace", "description": "Google 办公套件全集成，邮件、日历、文档、表格一站式操作", "category": "效率", "users": "185k", "source": "clawhub", "trend": "stable", "url": ""},
    {"name": "Felo Search", "description": "AI 增强搜索引擎，深度网络调研与智能信息整合", "category": "搜索", "users": "145k", "source": "clawhub", "trend": "up", "url": ""},
    {"name": "自我改进代理", "description": "自动记录错误和纠正反馈，AI 持续自我学习优化行为逻辑", "category": "AI增强", "users": "119.4k", "source": "community", "trend": "up", "url": ""},
    {"name": "newapi", "description": "New API 官方管理技能，模型查询、令牌管理、余额查看全支持", "category": "工具", "users": "98.5k", "source": "official", "trend": "up", "url": ""},
    {"name": "Notion Power Tools", "description": "完整 Notion 集成，创建页面、更新数据库、搜索工作区、日志同步", "category": "效率", "users": "98k", "source": "clawhub", "trend": "stable", "url": ""},
    {"name": "systematic-debugging", "description": "结构化调试方法论，强制根因分析后再尝试修复", "category": "开发", "users": "87k", "source": "claude", "trend": "stable", "url": ""},
    {"name": "Agent Browser", "description": "网页自动化操作，表单填写、数据提取、交互测试", "category": "工具", "users": "76k", "source": "community", "trend": "up", "url": ""},
    {"name": "Summarize", "description": "长文本智能摘要，支持文章、文档、对话等多种格式", "category": "效率", "users": "72k", "source": "community", "trend": "stable", "url": ""},
    {"name": "File Manager", "description": "文件系统操作增强，批量处理、智能搜索、目录整理", "category": "工具", "users": "68k", "source": "community", "trend": "stable", "url": ""},
    {"name": "YouTube", "description": "视频下载与信息提取，字幕生成、内容摘要、章节分析", "category": "多媒体", "users": "65k", "source": "community", "trend": "up", "url": ""},
    {"name": "Code Review", "description": "自动化代码审查，Bug 检测、质量评估、最佳实践建议", "category": "开发", "users": "58k", "source": "claude", "trend": "up", "url": ""},
    {"name": "Telegram Bot", "description": "自定义 Telegram 机器人开发工具包，快速搭建交互机器人", "category": "通信", "users": "58k", "source": "community", "trend": "stable", "url": ""},
    {"name": "RSS Reader", "description": "信息源聚合订阅管理，智能过滤、分类、摘要推送", "category": "资讯", "users": "52k", "source": "community", "trend": "stable", "url": ""},
    {"name": "Database Skill", "description": "数据库管理与查询优化，分支特性、索引检测、N+1 问题识别", "category": "数据", "users": "45k", "source": "claude", "trend": "stable", "url": ""},
    {"name": "zeabur-deploy", "description": "Zeabur 一键部署技能，项目部署、域名配置、运维管理", "category": "部署", "users": "38k", "source": "community", "trend": "up", "url": ""},
    {"name": "doc-generator", "description": "自动生成项目文档，API 文档、README、架构说明", "category": "文档", "users": "35k", "source": "community", "trend": "stable", "url": ""},
    {"name": "git-assistant", "description": "Git 命令助手，版本控制最佳实践指导、冲突解决", "category": "开发", "users": "32k", "source": "community", "trend": "stable", "url": ""},
    {"name": "translator", "description": "多语言翻译工具，支持 100+ 语言互译、专业术语优化", "category": "通用", "users": "28k", "source": "community", "trend": "stable", "url": ""},
    {"name": "api-tester", "description": "API 接口测试工具，自动化测试、性能检测、文档生成", "category": "测试", "users": "25k", "source": "community", "trend": "stable", "url": ""},
    {"name": "db-manager", "description": "数据库管理与查询工具，支持 MySQL、PostgreSQL、Redis 等", "category": "数据", "users": "22k", "source": "community", "trend": "stable", "url": ""},
]


def main() -> None:
    print("=" * 50)
    print("Skill 排行榜数据爬取工具 (GitHub 渠道)")
    print("=" * 50)

    all_skills: List[Dict] = []

    # 1. GitHub 渠道（主数据源）
    github_skills = crawl_github()
    if github_skills:
        all_skills.extend(github_skills)

    # 2. 未来渠道在此聚合（结构已预留，暂不实现）：
    # openclaw_skills = crawl_openclaw()
    # if openclaw_skills:
    #     all_skills.extend(openclaw_skills)
    # skillhuyb_skills = crawl_skillhuyb()
    # if skillhuyb_skills:
    #     all_skills.extend(skillhuyb_skills)

    # 3. 兜底：GitHub 不可用时使用种子数据
    if not all_skills:
        print("\n⚠️ GitHub 渠道无数据，回退至 SEED_SKILLS 种子数据")
        all_skills = [dict(skill) for skill in SEED_SKILLS]

    # 4. 去重（按 name 小写，保留首次出现）
    seen: set = set()
    unique: List[Dict] = []
    for skill in all_skills:
        key = (skill.get("name") or "").lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(skill)

    # 5. 排名（GitHub 已按 stars 降序，直接顺序赋值）
    for index, skill in enumerate(unique):
        skill["rank"] = index + 1

    # 6. 分类列表（全部 + 去重类别，按首次出现顺序）
    categories = ["全部"]
    for skill in unique:
        cat = skill.get("category", "AI")
        if cat not in categories:
            categories.append(cat)

    # 7. 构建输出结构
    output = {
        "update_time": datetime.now().isoformat(),
        "total": len(unique),
        "categories": categories,
        "skills": unique,
    }

    # 8. 写出 JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(
        project_root, "web", "default", "public", "skills-ranking.json"
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    print(f"\n✅ 完成！共 {len(unique)} 个 Skill")
    print(f"📄 数据已保存到: {output_path}")
    print(f"🕐 更新时间: {output['update_time']}")


if __name__ == "__main__":
    main()
