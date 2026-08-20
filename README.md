# 学习打卡日志 📚

一个**纯前端**（HTML + CSS + 原生 JS，零框架、零构建）的每日学习打卡网站，带力扣式贡献日历，可直接部署到 GitHub Pages。

## 目录结构

```
.
├── index.html          # 首页（打卡日历）+ 日志列表 + 关于我 + 日志详情
├── style.css           # 全部样式（背景图、颜色都在这改）
├── main.js             # 功能：读清单、渲染日历、渲染 Markdown、页面路由
├── posts/
│   ├── posts.json      # ⭐ 日志日期清单（新增日志要在这里登记）
│   └── 2026-08-20.md   # 示例日志
└── README.md           # 本说明
```

## 打卡颜色规则

| 颜色 | 含义 |
|------|------|
| 🟢 绿色 | 当天写的日志（日期 == 今天） |
| 🔴 红色 | 补打卡（日期 < 今天） |
| ⚪ 白色 | 未打卡 |

> 未来日期的格子不会上色（还没到那天）。

## 怎么加一篇新日志

1. 在 `posts/` 文件夹新建一个文件，命名为 `YYYY-MM-DD.md`（例如 `2026-08-21.md`）。
2. 用 Markdown 写内容，第一行建议写 `# 你的标题`。
3. 打开 `posts/posts.json`，把日期加进数组：
   ```json
   ["2026-08-20", "2026-08-21"]
   ```
4. 刷新页面——日历对应日期会点亮，列表和详情也能看到。

> 浏览器无法自动扫描文件夹，所以必须手动在 `posts.json` 登记日期，程序才知道有哪些日志。

## 怎么改背景图

打开 `style.css`，找到最上方的「可改项」：

```css
--bg-image: url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?...');
```

- 换成在线图片：直接替换引号里的网址。
- 换成自己的图片：把图片（如 `bg.jpg`）放到本文件夹，改成：
  ```css
  --bg-image: url('bg.jpg');
  ```
- 不想用图片：删掉 `url('...')` 部分，只保留绿色渐变背景即可。

同区域还能改主题色（`--accent`）、打卡方块颜色（`--color-today` / `--color-backfill`）。

## 本地预览

因为页面用 `fetch` 读取文件，**不能直接双击 `index.html` 打开**（`file://` 协议会被浏览器拦截）。
请启动一个本地服务器：

```bash
# 进入本文件夹后执行：
python3 -m http.server 8000
```

然后浏览器访问 <http://localhost:8000> 即可。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（比如 `study-log`）。
2. 把本文件夹所有文件推上去：
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
3. 仓库页面 → **Settings** → **Pages** → **Source** 选择 `main` 分支、`/(root)` 目录 → 保存。
4. 等待一两分钟，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可看到你的打卡网站 🎉

> 提示：如果仓库名不是 `<用户名>.github.io`，站点地址会带仓库名后缀，完全正常。

## 技术说明

- **Markdown 渲染**：使用 [marked.js](https://marked.js.org/) 的 CDN 版本，无需下载。
- **无框架**：纯原生 JavaScript，方便新手阅读和修改（代码里有详细中文注释）。
- **安全提示**：日志为你自己撰写的可信内容，未做 HTML 消毒（sanitize）。若日后接受他人投稿，建议引入 DOMPurify 再做渲染。
