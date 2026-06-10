# 2026 FIFA 世界杯实时成绩网站

一个基于 Flask + football-data.org API 的世界杯实时数据网站。

## 🚀 快速启动

### 第一步：获取免费 API Key

1. 访问 [https://www.football-data.org/client/register](https://www.football-data.org/client/register)
2. 注册免费账号
3. 登录后在控制台找到你的 API Token

### 第二步：配置 API Key

```powershell
# 在项目目录下复制 .env.example 为 .env
copy .env.example .env
```

然后用记事本打开 `.env`，将 `your_api_key_here` 替换为你的真实 API Key。

### 第三步：安装依赖

```powershell
pip install -r requirements.txt
```

### 第四步：启动服务

```powershell
python app.py
```

### 第五步：打开浏览器

访问 [http://localhost:5000](http://localhost:5000) 即可看到网站！

---

## 📁 项目结构

```
世界杯实时成绩网站/
├── app.py              # Flask 后端（API中转+缓存）
├── requirements.txt    # Python 依赖
├── .env                # 你的API Key（不要提交到git！）
├── .env.example        # API Key 模板
├── templates/
│   └── index.html      # 主页面
└── static/
    ├── css/
    │   └── style.css   # 全部样式
    └── js/
        └── main.js     # 前端逻辑
```

## 🌐 API 说明

| 端点 | 说明 | 刷新频率 |
|------|------|---------|
| `/api/matches` | 全部赛程 | 30秒 |
| `/api/live` | 当前直播 | 15秒 |
| `/api/standings` | 积分榜 | 60秒 |
| `/api/scorers` | 射手榜 | 120秒 |

## ⚽ 功能

- 🔴 实时比分（自动30秒刷新）
- 📅 完整赛程对战表（含过滤器）
- 📊 小组积分榜
- ⚽ 射手榜
- 🌙 深色主题 + 玻璃拟态设计
- 📱 响应式，手机也能看
