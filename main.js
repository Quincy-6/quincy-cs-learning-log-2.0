/* =========================================================
   学习打卡日志 · 功能脚本（纯原生 JS，无任何框架）
   ---------------------------------------------------------
   工作流程：
     1. 读取 posts/posts.json（日志日期清单）
     2. 生成力扣式打卡日历，按规则上色
     3. 列表 / 详情视图渲染 Markdown
     4. 用 hash 路由在「首页 / 列表 / 关于我 / 详情」间切换
   ========================================================= */

/* ===================== 可改配置 ===================== */
const POSTS_DIR = 'posts/';                 // 日志文件夹
const MANIFEST  = 'posts/posts.json';       // 日期清单文件
const CALENDAR_WEEKS = 53;                  // 日历显示多少周（≈一年）

/* ===================== 工具函数 ===================== */

// 把 Date 格式化为 YYYY-MM-DD（按本地时区，避免 UTC 偏移导致日期错位）
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 今天的 YYYY-MM-DD
function todayStr() {
  return fmtDate(new Date());
}

// 比较日期字符串 a 是否早于 b（按字典序即可，因为格式固定为 YYYY-MM-DD）
function isBefore(a, b) {
  return a < b;
}

/* ===================== 读取清单 ===================== */
// 从 posts.json 读取所有日志日期，返回 { set: Set, diag: string }
// diag 为空字符串表示正常；非空时包含诊断信息供页面展示
async function loadManifest() {
  const url = MANIFEST;                       // 实际请求地址：posts/posts.json
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const msg = `⚠️ posts.json 加载失败（HTTP ${res.status}）\n请求地址：${url}\n请确认文件已推送到仓库且路径正确。`;
      console.error(msg);
      return { set: new Set(), diag: msg };
    }
    const text = await res.text();
    let dates;
    try {
      dates = JSON.parse(text);
    } catch (parseErr) {
      const msg = `⚠️ posts.json 内容不是合法 JSON\n请求地址：${url}\n原始内容前 200 字符：${text.slice(0, 200)}`;
      console.error(msg);
      return { set: new Set(), diag: msg };
    }
    if (!Array.isArray(dates)) {
      const msg = `⚠️ posts.json 不是数组格式（实际类型：${typeof dates}）\n请求地址：${url}`;
      console.error(msg);
      return { set: new Set(), diag: msg };
    }
    if (dates.length === 0) {
      const msg = `ℹ️ posts.json 为空数组 []，未登记任何日志日期。\n请在 posts.json 中添加日期（如 ["2026-08-20"]），并在 posts/ 目录下放置对应的 .md 文件。`;
      console.warn(msg);
      return { set: new Set(), diag: msg };
    }
    return { set: new Set(dates), diag: '' }; // 正常
  } catch (e) {
    const msg = `⚠️ 请求 posts.json 时发生网络错误\n请求地址：${url}\n错误：${e.message}`;
    console.error(msg);
    return { set: new Set(), diag: msg };
  }
}

// 在页面上显示诊断信息（如果有的话）
function showDiag(targetId, diag) {
  if (!diag) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  const banner = document.createElement('div');
  banner.className = 'diag-banner';
  banner.innerHTML = `<pre style="white-space:pre-wrap;margin:0">${diag.replace(/\n/g, '<br/>')}</pre>`;
  el.insertBefore(banner, el.firstChild);
}

/* ===================== 渲染打卡日历 ===================== */
async function renderCalendar() {
  const { set: postSet, diag } = await loadManifest();
  // 如果清单加载异常，在日历区域显示诊断信息
  showDiag('calendar', diag);
  const today = todayStr();

  const calendarEl = document.getElementById('calendar');
  const legendEl = document.getElementById('legend');

  // —— 计算起止日期：从「今天往前推 (CALENDAR_WEEKS*7 - 1) 天」开始，并对齐到周日 ——
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (CALENDAR_WEEKS * 7 - 1));
  // 让起始日落到所在周的第一天（周日，getDay() 周日为 0）
  start.setDate(start.getDate() - start.getDay());

  // 生成网格容器
  const grid = document.createElement('div');
  grid.className = 'cal-grid';

  // 月份标签行（粗略：每列若跨月则标出月份）
  const monthsRow = document.createElement('div');
  monthsRow.className = 'cal-months';

  let lastMonth = -1;
  // 逐周（列）逐日（行）生成方块
  const cursor = new Date(start);
  for (let w = 0; w < CALENDAR_WEEKS; w++) {
    // 月份标签：取该列第一天的月份
    const colMonth = cursor.getMonth();
    const monthLabel = document.createElement('div');
    monthLabel.className = 'cal-month';
    // 只在 1 月、4 月、7 月、10 月标注，避免太挤（也可改成每月都标）
    if (colMonth !== lastMonth && colMonth % 3 === 0) {
      monthLabel.textContent = (colMonth + 1) + '月';
      lastMonth = colMonth;
    }
    monthsRow.appendChild(monthLabel);

    for (let d = 0; d < 7; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';

      const dateStr = fmtDate(cursor);
      // 只渲染不晚于今天的格子（未来日期不显示，避免一片空白）
      if (isBefore(today, dateStr)) {
        cell.style.visibility = 'hidden';     // 未来日期：留空占位但不上色
      } else if (postSet.has(dateStr)) {
        // 有日志：当天 = 绿色，过去的补打卡 = 红色
        cell.classList.add(dateStr === today ? 'today' : 'backfill');
        cell.classList.add('has-post');
        cell.dataset.date = dateStr;
        cell.title = dateStr;
        // 点击跳转到该日志详情
        cell.addEventListener('click', () => {
          location.hash = '#/post/' + dateStr;
        });
      } else {
        // 无日志：白色
        cell.dataset.date = dateStr;
        cell.title = dateStr;
      }

      grid.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);   // 前进一天
    }
  }

  calendarEl.innerHTML = '';
  calendarEl.appendChild(monthsRow);
  calendarEl.appendChild(grid);

  // —— 图例 ——
  legendEl.innerHTML = `
    <span class="item"><span class="swatch today"></span>今天打卡（绿）</span>
    <span class="item"><span class="swatch backfill"></span>补打卡（红）</span>
    <span class="item"><span class="swatch empty"></span>未打卡（白）</span>
    <span class="item">共 ${postSet.size} 篇日志</span>
  `;

  // 返回清单，供「最近日志」复用，避免重复请求
  return postSet;
}

/* ===================== 渲染「最近日志」 ===================== */
function renderRecent(result) {
  const postSet = result.set || result;         // 兼容旧格式（Set）和新格式（{set, diag}）
  const diag = result.diag || '';
  const box = document.getElementById('recent-posts');
  showDiag('recent-posts', diag);
  const dates = [...postSet].sort().reverse().slice(0, 5); // 最新 5 篇
  box.innerHTML = '';
  // 清除之前可能插入的诊断横幅（showDiag 已处理，这里只清空原有内容）
  if (dates.length === 0 && !diag) {
    box.innerHTML = '<p class="post-empty">还没有日志，去 posts/ 写第一篇吧！</p>';
    return;
  }
  dates.forEach(date => {
    box.appendChild(makePostCard(date));
  });
}

// 生成一张日志卡片（日期 + 标题 + 跳转）
function makePostCard(date) {
  const card = document.createElement('a');
  card.className = 'post-card';
  card.href = '#/post/' + date;

  const left = document.createElement('div');
  const d = document.createElement('div');
  d.className = 'date';
  d.textContent = date;
  const t = document.createElement('div');
  t.className = 'title';
  t.textContent = '查看当日日志 →';
  left.appendChild(d);
  left.appendChild(t);

  const go = document.createElement('span');
  go.className = 'go';
  go.textContent = '打开';

  card.appendChild(left);
  card.appendChild(go);
  return card;
}

/* ===================== 渲染「日志列表」 ===================== */
async function renderPostsList() {
  const { set: postSet, diag } = await loadManifest();
  const box = document.getElementById('posts-list');
  showDiag('posts-list', diag);
  const dates = [...postSet].sort().reverse(); // 倒序：最新在上
  box.innerHTML = '';

  if (dates.length === 0 && !diag) {
    box.innerHTML = '<p class="post-empty">还没有日志，去 posts/ 写第一篇吧！</p>';
    return;
  }

  // 逐篇读取 Markdown，取第一行标题（# 标题）展示
  for (const date of dates) {
    const card = makePostCard(date);
    try {
      const res = await fetch(POSTS_DIR + date + '.md');
      if (res.ok) {
        const md = await res.text();
        const firstHeading = md
          .split('\n')
          .find(line => line.trim().startsWith('# '));
        if (firstHeading) {
          card.querySelector('.title').textContent = firstHeading.replace(/^#\s*/, '');
        }
      }
    } catch (_) { /* 忽略单篇读取错误 */ }
    box.appendChild(card);
  }
}

/* ===================== 渲染「日志详情」 ===================== */
async function renderPost(date) {
  const el = document.getElementById('post-content');
  // 读取路径固定为 posts/文件名（相对站点根目录，GitHub Pages 无需任何前缀）
  const url = POSTS_DIR + date + '.md';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    // marked.parse：把 Markdown 文本转成 HTML
    el.innerHTML = marked.parse(md);
  } catch (e) {
    // 把实际请求的地址打出来，方便排查（例如 GitHub Pages 上是否被 Jekyll 处理）
    console.error('加载日志失败：', url, e);
    el.innerHTML = `<div class="post-empty">
      没有找到 ${date} 的日志文件 😢<br/>
      请求地址：<code>${url}</code><br/>
      请确认：① 已在 <code>posts/</code> 新建 <code>${date}.md</code> 并登记到 <code>posts.json</code>；
      ② 仓库根目录有 <code>.nojekyll</code>，否则 GitHub Pages 会把 .md 编译成 .html。
    </div>`;
  }
  // 滚动到顶部，方便阅读
  window.scrollTo({ top: 0 });
}

/* ===================== hash 路由 ===================== */
// 根据 URL 的 # 部分切换显示哪个视图
function onHashChange() {
  const hash = location.hash || '#/';
  const views = {
    home: document.getElementById('view-home'),
    posts: document.getElementById('view-posts'),
    about: document.getElementById('view-about'),
    post: document.getElementById('view-post'),
  };

  // 先全部隐藏
  Object.values(views).forEach(v => (v.hidden = true));
  // 清除导航高亮
  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));

  const postMatch = hash.match(/^#\/post\/(.+)$/);

  if (postMatch) {
    views.post.hidden = false;
    document.querySelector('.nav a[data-nav="home"]').classList.add('active');
    renderPost(postMatch[1]);               // 渲染指定日期的日志
  } else if (hash.startsWith('#/posts')) {
    views.posts.hidden = false;
    document.querySelector('.nav a[data-nav="posts"]').classList.add('active');
    renderPostsList();
  } else if (hash.startsWith('#/about')) {
    views.about.hidden = false;
    document.querySelector('.nav a[data-nav="about"]').classList.add('active');
  } else {
    views.home.hidden = false;
    document.querySelector('.nav a[data-nav="home"]').classList.add('active');
    initHome();                             // 进入首页时刷新日历
  }
}

/* ===================== 初始化 ===================== */
async function initHome() {
  const result = await renderCalendar();
  renderRecent(result);
}

// 页面加载完成后启动路由
window.addEventListener('hashchange', onHashChange);
window.addEventListener('DOMContentLoaded', onHashChange);
