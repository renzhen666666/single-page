# 单页应用前端框架 (Single Page Frame)

一个简洁、灵活的单页应用 (SPA) 前端框架，基于 Flask 后端和 JavaScript 前端实现。该框架提供了一个完整的单页应用解决方案，支持动态页面加载、主题切换、导航菜单等功能。

## 功能特性

- **单页应用 (SPA)**: 无需重新加载整个页面即可切换内容，提供流畅的用户体验
- **动态页面加载**: 通过 API 接口动态加载页面内容，支持 HTML、CSS 和 JavaScript
- **页面配置管理**: 支持 JSON 配置文件管理页面元数据
- **主题切换**: 支持暗色/亮色主题切换，并保存用户偏好设置
- **导航菜单**: 可自定义的顶部导航栏和侧边栏菜单
- **模板渲染**: 支持简单的模板变量替换和条件渲染
- **脚本和样式动态加载**: 页面可按需加载特定的 JavaScript 和 CSS 文件
- **错误处理**: 内置 404 和 500 错误页面
- **日志记录**: 详细记录请求和错误日志

## 项目结构

```
single-page-frame/
├── app.py                 # Flask 应用主文件
├── tool.py                # 工具类和缓存功能
├── createPage.py          # 页面创建工具
├── zip.py                 # 压缩功能
├── index.html             # 主页面模板
├── static/                # 静态资源
│   ├── frame.js           # 前端框架核心逻辑
│   ├── css/               # CSS 样式文件
│   └── js/                # JavaScript 文件
├── templates/             # 全局模板 (nav.html, menu.html)
├── pages/                 # 页面内容目录
│   ├── home/              # 首页
│   ├── p1/, p2/, p3/      # 其他页面
│   └── error/             # 错误页面
├── data/                  # 数据文件 (图片等)
└── logs/                  # 日志文件
```

## 安装和启动

### 依赖要求

- Python 3.6+
- Flask
- 其他 Python 标准库组件

### 安装步骤

1. 克隆或下载项目文件
2. 安装 Python 依赖：
   ```bash
   pip install flask
   ```
3. 启动应用：
   ```bash
   python app.py
   ```
4. 在浏览器中访问 `http://localhost:5000`

## 使用方法

### 页面创建

框架支持通过 `createPage.py` 工具创建新页面：

方法一：通过 Python 代码
```python
from tool import createPage

# 创建一个新页面
createPage('/mypage', '我的页面标题')
```

方法二：通过命令行
```bash
python createPage.py /mypage "我的页面标题"
```

每个页面包含两个文件：
- `{page_name}.html` - 页面 HTML 内容
- `{page_name}.json` - 页面配置数据

### 页面 HTML 结构

页面 HTML 文件支持在 `<script>` 标签中嵌入页面特定的 JavaScript 代码：

```html
<div class="text-center">
    <h1>页面标题</h1>
    <a href="/home">首页</a>
    <script>
        console.log("页面已加载");
    </script>
</div>
```

### 配置文件

页面的 JSON 配置文件可以包含以下可选字段：
- `title`: 页面标题
- `scripts`: 需要加载的 JavaScript 模块数组
- `styles`: 需要加载的 CSS 文件数组
- `nav`, `menu`: 导航和菜单相关的数据

### 模板语法

导航和菜单模板支持以下模板语法：
- `{variable}` - 变量替换
- `{condition}...{/condition}` - 条件渲染

### 主题切换

框架支持暗色/亮色主题切换，用户偏好会保存在 localStorage 中。

## 前端功能

### 动态内容加载

框架通过 `/api/pages/{url}` 接口获取页面内容，并动态更新 DOM。

### 导航处理

所有链接都会被捕获并处理为 SPA 导航，不会导致页面刷新。

### 组件绑定

支持通过 `data-on-click` 属性将 DOM 元素绑定到 JavaScript 方法。

## API 接口

- `GET /` - 主页面入口
- `POST /api/pages/{url}` - 获取页面内容
- `POST /api/navigation` - 获取导航栏内容
- `GET /js/{filename}` - 静态 JS 文件
- `GET /css/{filename}` - 静态 CSS 文件
- `GET /img/{filename}` - 静态图片文件

## 日志系统

系统会记录所有请求到 `logs/` 目录下的三个文件：
- `info.log` - 信息日志
- `wrong.log` - 警告日志
- `error.log` - 错误日志

## 扩展性

此框架设计为易于扩展，您可以：

- 添加新的页面类型
- 扩展模板功能
- 增加新的 API 接口
- 自定义导航和菜单结构
- 添加新的前端组件

## 许可证

此项目为开源项目，可根据需要自由使用和修改。