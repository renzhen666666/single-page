# 单页应用前端框架 (Single Page Frame)

一个简洁、灵活的单页应用 (SPA) 前端框架，基于 JavaScript 实现。该框架提供了一个完整的单页应用解决方案，支持动态页面加载、主题切换、导航菜单等功能。

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
- **路由参数支持**: 支持带参数的路由配置

## 项目结构

```
single-page-frame/
├── app.mjs                 # Express 应用主文件（本地开发用）
├── build.cjs               # 构建脚本
├── config.js               # 前端配置文件
├── createPage.py           # 页面创建工具
├── upload-kv.mjs           # KV 数据上传脚本（Cloudflare Workers）
├── zip.py                  # 压缩功能
├── index.html              # 主页面模板
├── package.json            # 项目依赖配置
├── wrangler.toml           # Cloudflare Workers 配置
├── routes.mjs              # 路由配置文件
├── static/                 # 静态资源
│   ├── frame.js            # 前端框架核心逻辑
│   ├── css/                # CSS 样式文件
│   └── js/                 # JavaScript 文件
├── templates/              # 全局模板
│   ├── nav.html            # 导航栏模板
│   └── menu.html           # 侧边栏模板
├── pages/                  # 页面内容目录
│   ├── home/               # 首页
│   │   ├── home.html       # 首页 HTML 内容
│   │   └── home.json       # 首页配置文件
│   ├── p1/, p2/, p3/       # 其他页面
│   └── error/              # 错误页面
├── data/                   # 数据文件（图片等）
├── logs/                   # 日志文件
├── functions/              # Cloudflare Workers Functions
│   └── api/                # API 端点
└── dist/                   # 构建输出目录
```

## 安装和启动

### 本地开发环境

1. 克隆或下载项目文件
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动应用：
   ```bash
   npm start
   ```
   或
   ```bash
   npm run dev
   ```

### Cloudflare Workers 部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 配置 `wrangler.toml` 文件，设置正确的 KV Namespace ID 和域名

3. 上传数据到 KV：
   ```bash
   node upload-kv.mjs preview   # 上传到预览环境
   node upload-kv.mjs production # 上传到生产环境
   ```

4. 本地测试：
   ```bash
   npx wrangler pages dev dist
   ```

5. 部署到 Cloudflare Pages：
   ```bash
   npm run deploy
   ```

## 使用方法

### 页面创建

使用 `createPage.py` 工具创建新页面：

```bash
python createPage.py /mypage "我的页面标题"
```

每个页面包含两个文件：
- `{page_name}.html` - 页面 HTML 内容
- `{page_name}.json` - 页面配置数据

### 页面配置文件格式

页面配置文件（`.json`）支持以下字段：

#### 基本配置

```json
{
  "title": "页面标题",
  "scripts": ["script1.js", "script2.js"],
  "styles": ["style1.css", "style2.css"]
}
```

- `title` (string): 页面标题，会设置到 document.title
- `scripts` (array): 需要加载的 JavaScript 模块文件列表
- `styles` (array): 需要加载的 CSS 文件列表

#### 导航栏配置

```json
{
  "navbar": {
    "display": true,
    "template": "nav.html",
    "page": "home",
    "renderContent": true
  }
}
```

- `display` (boolean): 是否显示导航栏，默认 `true`
- `template` (string): 导航栏模板文件名
- `page` (string): 当前页面对应的导航项 `page` 属性值
- `renderContent` (boolean): 是否使用页面配置渲染模板内容，默认 `true`

#### 侧边栏配置

```json
{
  "siderbar": {
    "display": true,
    "template": "menu.html",
    "page": "home"
  }
}
```

- `display` (boolean): 是否显示侧边栏，默认 `true`
- `template` (string): 侧边栏模板文件名
- `page` (string): 当前页面对应的侧边栏项 `page` 属性值

#### 完整配置示例

```json
{
  "title": "我的页面",
  "scripts": ["test.js"],
  "styles": ["test.css"],
  "navbar": {
    "display": true,
    "template": "nav.html",
    "page": "mypage",
    "renderContent": true
  },
  "siderbar": {
    "display": true,
    "template": "menu.html",
    "page": "mypage"
  }
}
```

### 页面 HTML 文件格式

页面 HTML 文件支持多种嵌入内容和配置方式：

#### 1. 基本 HTML 内容

```html
<div class="container">
  <h1>欢迎来到我的页面</h1>
  <p>这是一个单页应用示例。</p>
</div>
```

#### 2. 嵌入 JavaScript

使用 `<script>` 标签嵌入页面特定的 JavaScript 代码：

```html
<div class="container">
  <h1>页面标题</h1>
</div>

<script>
  console.log("页面已加载");
  // 页面特定的逻辑代码
</script>
```

#### 3. 嵌入 CSS 样式

使用 `<style>` 标签嵌入页面特定的 CSS 样式：

```html
<div class="container">
  <h1 class="custom-title">页面标题</h1>
</div>

<style>
  .custom-title {
    color: #333;
    font-size: 2rem;
  }
</style>
```

#### 4. 使用 JSON 配置

使用 `{json}...{/json}` 语法嵌入 JSON 配置：

```html
<div class="container">
  <h1>页面标题</h1>
</div>

{json}
{
  "title": "页面标题",
  "customField": "自定义值"
}
{/json}
```

#### 5. 使用条件配置

使用 `{key}...{/key}` 语法创建条件配置：

```html
<div class="container">
  <h1>页面标题</h1>
</div>

{customConfig}
这是自定义配置内容
{/customConfig}
```

这些配置会被提取到页面的 `config` 对象中，可用于模板渲染。

### 导航栏/侧边栏模板文件

模板文件支持以下语法和功能：

#### 1. 变量替换

使用 `{variableName}` 语法进行变量替换：

```html
<nav class="navbar">
  <h1>{title}</h1>
</nav>
```

如果 `renderContent` 为 `true`，框架会将页面配置中的变量替换到模板中。

#### 2. 条件渲染

使用 `{condition}...{/condition}` 语法进行条件渲染：

```html
{nav}
<div class="nav-items">
  <!-- 导航内容 -->
</div>
{/nav}

{goBtn}
<button class="go-button">前往</button>
{/goBtn}
```

只有当配置中存在对应的键且值为真时，内容才会被渲染。

#### 3. 自动设置 Active 状态

框架会自动为当前页面的导航项添加 `active` 类：

```html
<nav class="navbar">
  <ul>
    <li><a href="/home" page="home" class="nav-link">首页</a></li>
    <li><a href="/p1" page="p1" class="nav-link">P1</a></li>
    <li><a href="/p2" page="p2" class="nav-link">P2</a></li>
  </ul>
</nav>
```

**工作原理：**
- 导航项必须设置 `page` 属性，如 `page="home"`
- 页面配置中需要设置对应的 `navbar.page` 或 `siderbar.page` 值
- 框架会自动匹配并为当前页面的导航项添加 `active` 类
- 同时会移除其他导航项的 `active` 类

**示例：**

如果当前页面配置为：
```json
{
  "navbar": {
    "page": "p1"
  }
}
```

框架会自动为 `<a href="/p1" page="p1">` 添加 `active` 类。

#### 4. 侧边栏切换功能

侧边栏模板支持自动切换功能：

```html
<div class="offcanvas" id="sidebar">
  <div class="offcanvas-header">
    <h5>菜单</h5>
    <button type="button" siderbar-toggle>关闭</button>
  </div>
  <div class="offcanvas-body">
    <!-- 菜单内容 -->
  </div>
</div>
```

**功能说明：**
- 按钮添加 `siderbar-toggle` 属性后，框架会在页面加载时自动点击
- 这可以用于自动打开或关闭侧边栏
- 类似地，导航栏也可以使用 `navbar-toggle` 属性

#### 5. 完整模板示例

**导航栏模板 (nav.html)：**

```html
<nav class="navbar navbar-expand bg-white shadow-sm">
  <div class="container">
    <button class="btn-menu" id="sidebarToggle" data-bs-toggle="offcanvas" data-bs-target="#sidebar">
      <img src="/img/menu.png" alt="菜单">
    </button>
    <div class="navbar-collapse">
      <ul class="navbar-nav ms-auto">
        {nav}
        <li class="nav-item">
          <a href="/home" page="home" class="nav-link">首页</a>
        </li>
        <li class="nav-item">
          <a href="/p1" page="p1" class="nav-link">P1</a>
        </li>
        {/nav}

        {goBtn}
        <li class="nav-item">
          <button class="btn btn-primary">前往</button>
        </li>
        {/goBtn}
      </ul>
    </div>
  </div>
</nav>
```

**侧边栏模板 (menu.html)：**

```html
<div class="offcanvas offcanvas-start" tabindex="-1" id="sidebar">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title">
      <button id="theme-toggle" class="theme-toggle btn btn-outline-light" data-on-click="toggleTheme">
        <span class="theme-icon">🌙</span>
      </button>
    </h5>
    <button type="button" class="btn-menu-close" siderbar-toggle>
      <img src="/img/menu-fold.png" alt="关闭菜单">
    </button>
  </div>
  <div class="offcanvas-body">
    <div class="sidebar-menu">
      <ul class="list-unstyled">
        <li class="sidebar-item">
          <a href="/home" page="home" class="nav-link sidebar-link">
            <i class="bi bi-house-door me-3"></i>
            <span>首页</span>
          </a>
        </li>
        <li class="sidebar-item">
          <a href="/p1" page="p1" class="nav-link sidebar-link">
            <i class="bi bi-chat-square-text me-3"></i>
            <span>P1</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</div>
```

### 事件绑定

框架支持通过 `data-on-*` 属性绑定事件处理函数：

```html
<button data-on-click="handleClick" data-click-params='["param1", "param2"]'>
  点击我
</button>

<input data-on-input="handleInput" data-input-params='["event", "this.value"]'>
```

**支持的属性：**
- `data-on-{event}`: 绑定事件处理器，`{event}` 为事件类型（如 `click`、`input`、`submit` 等）
- `data-{event}-params`: 传递给处理函数的参数数组

**参数支持：**
- 字符串、数字、布尔值等基本类型
- `"event"`: 事件对象
- `"this.{property}"`: 访问元素的属性，如 `"this.value"`、`"this.dataset.id"`

**示例：**

```html
<!-- 基本用法 -->
<button data-on-click="showMessage" data-click-params='["Hello"]'>
  显示消息
</button>

<!-- 使用事件对象 -->
<input data-on-input="handleInput" data-input-params='["event", "this.value"]'>

<!-- 访问元素属性 -->
<div data-on-click="handleElementClick" data-click-params='["this.dataset.id"]' data-id="123">
  点击
</div>
```

### JavaScript 模块

页面可以加载独立的 JavaScript 模块：

1. 在页面配置中指定模块：
```json
{
  "scripts": ["test.js"]
}
```

2. 创建模块文件（如 `static/js/test.js`）：
```javascript
// 导出方法
export const methods = {
  handleClick: (param) => {
    console.log('Clicked:', param);
  }
};

// 导出初始化函数（可选）
export function init() {
  console.log('Page initialized');
}
```

**注意事项：**
- 模块必须导出 `methods` 对象，包含所有可用的处理函数
- 可以导出 `init` 函数，在页面加载完成后自动调用
- 模块会在页面加载时自动加载

### 主题切换

框架内置了主题切换功能：

```html
<button id="theme-toggle" class="theme-toggle" data-on-click="toggleTheme">
  <span class="theme-icon">🌙</span>
</button>
```

**功能说明：**
- 点击按钮会在暗色和亮色主题之间切换
- 主题偏好会保存在 `localStorage` 中
- 页面加载时会自动应用保存的主题
- 在 CSS 中使用 `[data-theme="dark"]` 选择器定义暗色主题样式

### 路由配置

支持带参数的路由配置（`routes.mjs`）：

```javascript
export default [
  {
    path: '/route/:q<int>',
    template: {
      path: '/route',
      params: {
        query: 'q'
      }
    },
    function: {
      target: (q) => { console.log(q) },
      params: {
        q: 'q'
      }
    }
  }
]
```

**路由参数类型：**
- `:name` - 字符串类型
- `:name<int>` - 整数类型
- `:name<float>` - 浮点数类型

**使用示例：**
访问 `/route/123` 会匹配到路由，参数 `q` 的值为 `123`（整数）。

## API 接口

### 本地开发环境 (Express)

- `GET /` - 主页面入口
- `POST /api/pages/{url}` - 获取页面内容
- `POST /api/template/{template}` - 获取模板内容
- `GET /js/{filename}` - 静态 JS 文件
- `GET /css/{filename}` - 静态 CSS 文件
- `GET /img/{filename}` - 静态图片文件
- `GET /config.js` - 配置文件
- `GET /frame.js` - 框架核心文件

### Cloudflare Workers 环境

- `GET /` - 主页面入口
- `POST /api/pages/{url}` - 获取页面内容（从 KV 读取）
- `POST /api/template/{template}` - 获取模板内容（从 KV 读取）
- `GET /js/{filename}` - 静态 JS 文件
- `GET /css/{filename}` - 静态 CSS 文件
- `GET /img/{filename}` - 静态图片文件
- `GET /frame.js` - 框架核心文件
- `GET /config.js` - 配置文件

## 日志系统

本地开发环境会记录所有请求到 `logs/` 目录下的三个文件：
- `info-{date}.log` - 信息日志
- `wrong-{date}.log` - 警告日志
- `error-{date}.log` - 错误日志

## 扩展性

此框架设计为易于扩展，您可以：

- 添加新的页面类型
- 扩展模板功能
- 增加新的 API 接口
- 自定义导航和菜单结构
- 添加新的前端组件
- 集成第三方库和框架

## 常见问题

### 如何创建新页面？

使用 `createPage.py` 工具：
```bash
python createPage.py /mypage "我的页面标题"
```

### 如何自定义主题？

在 CSS 中使用 `[data-theme="dark"]` 选择器：
```css
[data-theme="dark"] {
  background-color: #1a1a1a;
  color: #ffffff;
}
```

### 如何添加新的静态资源？

将文件放到对应的目录：
- JS 文件 → `static/js/`
- CSS 文件 → `static/css/`
- 图片文件 → `data/img/`

### 如何调试页面？

1. 打开浏览器开发者工具
2. 查看控制台日志
3. 检查网络请求
4. 查看 `logs/` 目录下的日志文件

## 部署到 Cloudflare Workers

详细部署步骤请参考项目文档中的 Cloudflare Workers 部署章节。

## 许可证

此项目为开源项目，可根据需要自由使用和修改。