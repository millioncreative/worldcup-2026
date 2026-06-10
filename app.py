import os
import time
import requests
from flask import Flask, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("FOOTBALL_API_KEY", "")
API_BASE = "https://api.football-data.org/v4"
HEADERS = {"X-Auth-Token": API_KEY}

# ── 简单内存缓存，60秒过期 ──────────────────────────────────────────────────
_cache: dict = {}

def cached_get(url: str, ttl: int = 60) -> dict | None:
    """发送请求并缓存结果，避免超出免费API限额。"""
    now = time.time()
    if url in _cache:
        data, ts = _cache[url]
        if now - ts < ttl:
            return data
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        _cache[url] = (data, now)
        return data
    except requests.RequestException as e:
        print(f"[API Error] {url}: {e}")
        # 如果请求失败，返回旧缓存（如果有）
        if url in _cache:
            return _cache[url][0]
        return None


# ── 路由 ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/matches")
def matches():
    """返回世界杯所有赛程（含实时/历史比分）。"""
    data = cached_get(f"{API_BASE}/competitions/WC/matches", ttl=30)
    if data is None:
        return jsonify({"error": "无法获取赛事数据，请检查API Key"}), 503
    return jsonify(data)


@app.route("/api/standings")
def standings():
    """返回小组赛积分榜。"""
    data = cached_get(f"{API_BASE}/competitions/WC/standings", ttl=60)
    if data is None:
        return jsonify({"error": "无法获取积分榜数据"}), 503
    return jsonify(data)


@app.route("/api/scorers")
def scorers():
    """返回射手榜（前10）。"""
    data = cached_get(f"{API_BASE}/competitions/WC/scorers?limit=10", ttl=120)
    if data is None:
        return jsonify({"error": "无法获取射手榜数据"}), 503
    return jsonify(data)


@app.route("/api/live")
def live():
    """返回当前正在进行的比赛（仅LIVE状态）。"""
    data = cached_get(f"{API_BASE}/competitions/WC/matches?status=LIVE", ttl=15)
    if data is None:
        return jsonify({"matches": []})
    return jsonify(data)


if __name__ == "__main__":
    if not API_KEY:
        print("[WARNING] FOOTBALL_API_KEY not set. Please create a .env file with your API key.")
    app.run(debug=True, port=5000)
