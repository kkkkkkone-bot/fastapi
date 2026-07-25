# Skill 排行榜数据爬取脚本

本目录下的 `crawl_skills.py` 用于抓取 **AI Agent Skill 排行榜** 数据，并生成前端所需的静态 JSON 文件。

> 当前为第一期，仅实现 **GitHub 渠道**（通过 GitHub Search API 抓取 `topic:agent-skills` 下 star 数最高的前 100 个仓库）。

---

## 功能说明

- 数据源：GitHub Search API
  `https://api.github.com/search/repositories?q=topic:agent-skills&sort=stars&order=desc&per_page=100`
- 输出：`<项目根>/web/default/public/skills-ranking.json`
- 输出结构：

```json
{
  "update_time": "2025-07-15T12:00:00.000000",
  "total": 100,
  "categories": ["全部", "AI", "工具", "安全", "..."],
  "skills": [
    {
      "rank": 1,
      "name": "anthropics/claude-skills",
      "description": "仓库描述（截断至 200 字）",
      "category": "AI",
      "users": "12.3k",
      "source": "github",
      "trend": "up",
      "url": "https://github.com/anthropics/claude-skills"
    }
  ]
}
```

字段含义：

| 字段          | 说明                                                         |
| ------------- | ------------------------------------------------------------ |
| `rank`        | 排名（1..N，按 star 降序）                                   |
| `name`        | 仓库 `full_name`（如 `anthropics/claude-skills`）           |
| `description` | 仓库描述（空/null 兜底为「暂无描述」，截断至 200 字）         |
| `category`    | 中文类别（由 topics + description 关键词映射，见下文）       |
| `users`       | 受欢迎度展示值（即 star 数的友好格式，如 `12.3k` / `1.2M`）  |
| `source`      | 数据来源渠道，GitHub 渠道固定为 `"github"`                   |
| `trend`       | 趋势：`up`（近 30 天有推送）/ `stable`（更早）               |
| `url`         | 原站链接（`html_url`），前端用于「查看原站」跳转             |

### 分类映射规则

按优先级匹配第一个命中的关键词（基于 `topics` 与 `description` 的小写文本，使用词边界正则以减少误匹配）：

`security`→安全 · `web`→工具 · `cli`→工具 · `api`→工具 · `database|sql`→数据 · `bot`→通信 · `search`→搜索 · `scrap`→工具 · `test`→测试 · `doc`→文档 · `deploy`→部署 · `ai|ml|llm`→AI增强 · `agent`→AI · 默认 `AI`

---

## 运行方式

### 前置要求

- Python 3.8+（**仅使用标准库**，无需 `pip install` 任何依赖）
- 网络可访问 `api.github.com`

### 执行

```bash
# 方式一：在项目根目录执行
cd /path/to/fastapi
python scripts/crawl_skills.py

# 方式二：指定解释器
/path/to/python3 scripts/crawl_skills.py
```

### 环境变量

| 变量           | 必填 | 说明                                                                       |
| -------------- | ---- | -------------------------------------------------------------------------- |
| `GITHUB_TOKEN` | 否   | GitHub Personal Access Token。匿名调用 search API 限速 10 次/分钟（单次足够）；配置后限额提升至 5000 次/小时，且可减少限速概率。 |

```bash
# Linux / macOS
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
python scripts/crawl_skills.py

# Windows PowerShell
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
python scripts/crawl_skills.py
```

---

## 定时爬取配置

### Linux / macOS — crontab

每日凌晨 4 点执行，并将日志追加到 `/var/log/skill-ranking.log`：

```cron
0 4 * * * cd /path/to/fastapi && /usr/bin/python3 scripts/crawl_skills.py >> /var/log/skill-ranking.log 2>&1
```

管理：

```bash
crontab -e      # 编辑定时任务
crontab -l      # 查看当前任务
```

### Windows — 任务计划程序

1. 打开 **任务计划程序**（Task Scheduler）→ **创建基本任务**。
2. 触发器：选择 **每天**，设定时间（如 04:00）。
3. 操作：选择 **启动程序**。
   - 程序/脚本：`C:\Path\To\python.exe`
   - 参数：`C:\path\to\fastapi\scripts\crawl_skills.py`
   - 起始于（可选）：`C:\path\to\fastapi`
4. 完成后可在「任务计划程序库」中右键 **运行** 手动测试。

可选：若需 `GITHUB_TOKEN`，在任务属性的「操作 → 编辑 → 起始于」同级，通过「添加参数」或在包装 `.bat` 中 `set GITHUB_TOKEN=...` 后调用脚本。

---

## 可插拔渠道架构（扩展指引）

脚本已为多渠道预留结构：

- 每个渠道实现为一个独立的 `crawl_xxx()` 函数，返回 `List[Dict]`（统一 Skill 结构，**不含 `rank`**）。
- `main()` 负责：依次调用各渠道 → 合并 → 按 `name` 去重 → 顺序赋值 `rank` → 生成分类列表 → 写出 JSON。
- 新增渠道（如 `openclaw`、`skillhuyb`）只需：
  1. 编写 `crawl_openclaw() -> List[Dict]`；
  2. 在 `main()` 中取消注释对应聚合代码并 `all_skills.extend(...)`；
  3. 保持字段结构一致即可，无需改动写出逻辑。

> 当 GitHub 渠道返回空（网络不可达 / 触发限速）时，脚本会自动回退到 `SEED_SKILLS` 种子数据，避免前端出现空榜单。
