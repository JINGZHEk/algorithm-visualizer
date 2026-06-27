# 算法过程可视化实验平台 · AlgoVista

基于 Vue 3 + TypeScript + Vite + Element Plus 构建的算法可视化教学工具，支持 5 种经典算法的逐步执行过程展示，内置 **Canvas 2D / SVG-D3 双渲染引擎**与 **AI 算法问答助手**。

## 运行环境

- Node.js >= 18
- 现代浏览器（Chrome、Edge、Firefox、Safari）

## 安装与运行

```bash
npm install       # 安装依赖
npm run dev       # 开发模式运行 → http://localhost:5173
npm run build     # 生产构建
npm run test      # 单元测试（17 条自动化用例）
npm run lint      # 代码规范检查
npm run preview   # 预览构建结果
```

## 算法选择

系统实现了 **4 种类型、5 个算法** 的过程可视化：

| 类型 | 算法 | 难度 | 时间复杂度 |
|------|------|------|-----------|
| 排序算法 | 冒泡排序 | 简单 | O(n²) |
| 排序算法 | 快速排序 | 中等 | O(n log n) 平均 / O(n²) 最坏 |
| 图算法 | Dijkstra 最短路径 | 中等 | O(V²) / O((V+E)logV) |
| 树结构 | 哈夫曼树构造 | 中等 | O(n log n) |
| 回溯算法 | 迷宫 DFS 回溯 | 中-高 | O(n·m) 一般 / O(2^(n·m)) 最坏 |

## 输入格式

### 排序算法
- 逗号分隔的整数，范围 [-999, 999]，数量 2~20
- 示例：`64, 34, 25, 12, 22, 11, 90`

### Dijkstra 最短路径
- 通过预设测试用例选择图结构（共 3 组：连通图 / 非连通图 / 等权多路径）
- 支持**源节点选择**（下拉框切换起点）

### 哈夫曼树
- 格式：`字符:频率`，逗号分隔，最多 8 个字符
- 示例：`A:5, B:9, C:12, D:13, E:16`

### 迷宫求解
- 预设用例加载或**自定义尺寸（4×4 ~ 10×10）随机生成**
- `0` 表示通道，`1` 表示墙壁

## 功能特性

### 基础功能
1. 5 个算法的完整执行过程可视化
2. 统一入口和统一界面风格（深色 / 浅色 / 高对比三主题）
3. 手动输入数据、随机生成测试数据、**15 条预设测试用例**
4. 逐步展示执行过程（非仅最终结果）
5. 伪代码同步高亮
6. 当前步骤中文讲解
7. 时间/空间复杂度展示

### 扩展功能
1. 播放 / 暂停 / 单步前进 / 上一步回退 / 重置控制
2. 播放速度调节（50ms ~ 2000ms）
3. 进度条拖拽跳转
4. **键盘快捷键**：<kbd>Space</kbd> 播放暂停 · <kbd>←→</kbd> 单步 · <kbd>R</kbd> 重置 · <kbd>1</kbd>~<kbd>5</kbd> 调速
5. 算法对比模式（冒泡 vs 快排，左右分屏同步播放，**支持 Canvas/D3 双后端**）
6. 执行日志导出（TXT 格式，文件名含时间戳）
7. 输入格式校验与友好错误提示
8. **Canvas 2D / SVG-D3 双渲染后端运行时切换**（全部算法页 + 对比页）
9. **输入数据 localStorage 自动回填**（刷新页面后恢复最近输入）
10. **AI 算法问答助手**（全局悬浮窗，混合模式）

## AI 算法问答助手

平台内置一个全局悬浮的 AI 助手（右下角 🤖 按钮，或顶部导航「AI 助手」入口），采用**混合模式**运行：

- **在线模式**：在助手设置（⚙️）中填入任意 **OpenAI 兼容接口** 的 API Key、Base URL 与模型名后，助手通过流式接口（SSE）实时作答。密钥仅保存在本地浏览器 `localStorage`，不会上传服务器。
- **离线模式**：未配置 API Key（或在线调用失败）时，自动回退到内置算法知识库（**15+ 条结构化条目**），基于关键词检索返回讲解。**保证无网络、无密钥环境下（如课堂演示）依然可用。**

特性：
- **上下文感知**：自动识别当前所在算法页，优先围绕该算法作答，快捷提问随页面变化
- **流式输出 + 打字动画**，内置轻量 Markdown 渲染（代码块、列表、引用、标题）
- **对话历史持久化**：最近 50 条消息保存至 localStorage，刷新不丢失
- **一键复制回答**：每条 assistant 消息可复制到剪贴板
- 知识库覆盖 5 个算法的原理 / 复杂度 / 稳定性，以及时间复杂度、贪心、分治、BFS vs DFS 等通用概念和平台用法

### AI 配置示例

| 配置项 | 示例值 |
|--------|--------|
| API Key | `sk-...`（你的密钥） |
| Base URL | `https://api.openai.com/v1` |
| 模型名称 | `gpt-4o-mini` |

> 任何兼容 OpenAI `/chat/completions` 接口的服务（OpenAI、兼容代理、本地推理服务等）均可填入对应 Base URL 使用。

## 界面与设计

- 明亮活力的深色主题，青绿 / 蓝 / 琥珀渐变主色，玻璃拟态面板
- 统一的设计令牌系统（颜色、圆角、阴影、间距）集中在 `src/style.css`，全站复用
- 支持深色 / 浅色 / 高对比三主题，CSS 变量驱动运行时切换
- 三栏布局：左侧数据输入 + 中央可视化画布 + 右侧伪代码 / 步骤 / 复杂度
- 首页 Hero + 数据概览 + 算法卡片网格，悬停动效与路由切换过渡
- 响应式设计：1180px / 720px / 540px 三级断点适配

## 测试用例

每个算法均提供至少 2 条预设测试用例，**共计 15 条**，覆盖边界与极端场景：

| 算法 | 测试用例 | 验证目标 |
|------|---------|---------|
| 冒泡排序 | 常规乱序、完全倒序（最坏）、全等数组（最优） | 正常排序 / 每轮必交换 / 死循环防御 |
| 快速排序 | 常规乱序、正序退化、大量重复 | 划分演示 / O(n²) 退化 / 重复处理 |
| Dijkstra | 普通连通图、非连通图（含孤立节点）、等权多路径 | 松弛过程 / ∞ 距离 / 等价路径选择 |
| 哈夫曼树 | 均匀频率分布、极端悬殊、英文高频字母 | 标准合并 / 不平衡树 / 实际压缩场景 |
| 迷宫求解 | 唯一解 5×5、无解死胡同、多解 8×8 | 标准寻路 / 回溯动画 / 多路径 |

**自动化单元测试**：17 条 Vitest 用例，4 个测试文件，算法层 100% 覆盖。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) |
| 类型系统 | TypeScript（strict 模式） |
| 构建工具 | Vite |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 图形渲染 | HTML5 Canvas 2D API + SVG / D3 适配器 |
| 后台计算 | Web Worker 步骤生成 |
| 测试框架 | Vitest |
| AI 接入 | OpenAI 兼容接口（fetch 流式 SSE）+ 本地知识库兜底 |
| 代码规范 | ESLint + Prettier |

## 架构亮点

- **策略模式**算法引擎：`src/core/algorithmEngine.ts` — 统一 `AlgorithmStrategy` 接口 + `AlgorithmRegistry` 注册表，新增算法只需实现接口并注册
- **工厂模式**渲染器：`src/renderers/rendererFactory.ts` — `createRenderer(algo, backend)` 一行调用创建任何算法的任何后端渲染器
- **模板方法**渲染基类：`src/renderers/canvas/BaseCanvasRenderer.ts` — 统一 DPR 适配、静态层缓存、生命周期管理
- **适配器模式**D3 渲染器：6 个 D3 渲染器与 Canvas 渲染器实现完全相同的 `VisualRenderer` 接口
- **观察者模式**Pinia Store → `watch(currentStep)` 自动驱动 Canvas 重绘、伪代码高亮、步骤讲解三者同步
- **状态模式**播放状态机：`idle → playing ↔ paused → finished`
- `requestAnimationFrame` 播放调度（替代 setTimeout，自动跟随刷新率，标签页不可见时暂停）
- `OffscreenCanvasBuffer` 离屏静态层缓存（避免每帧重绘背景）
- Web Worker 算法执行器（后台线程生成步骤序列，主线程零阻塞，不可用时同步降级）
- AI 流式输出 + 超时降级 + 滑动窗口上下文：`src/ai/streaming.ts`
- 事件总线（发布订阅）：`src/utils/eventBus.ts` — 跨组件轻量通信
- localStorage 完整持久化方案：`src/utils/storage.ts` — AI 配置 / 偏好 / 对话历史 / 最近输入

### D3/SVG 增强渲染器（相比 Canvas 2D 的独有特效）

| 特效 | 排序 | 图/Dijkstra | 树/Huffman | 迷宫 |
|------|:--:|:--:|:--:|:--:|
| 渐变填充 | ✅ 5 色渐变柱状图 | ✅ 径向渐变球形节点 | ✅ 叶子/内部双色渐变 | — |
| SVG 滤镜发光 | ✅ 比较/交换/完成三档 | ✅ 当前/检测/确认 glow | ✅ 叶子发光+阴影 | ✅ 当前格脉冲+路径 glow |
| 粒子爆炸 | ✅ 16 粒子 SVG animate | — | — | — |
| 贝塞尔曲线 | — | — | ✅ 二次贝塞尔树枝 | — |
| 虚线流动 | — | ✅ stroke-dashoffset | ✅ 描边绘制动画 | ✅ 流动虚线框 |
| 脉冲动画 | ✅ 状态指示点 | ✅ 节点波纹扩散 | — | ✅ 当前格透明度脉动 |
| 墙壁纹理 | — | — | — | ✅ feTurbulence 滤镜 |
| 3D 立体感 | ✅ 阴影+高光+渐变 | ✅ 阴影+渐变+脉冲环 | ✅ 阴影+球体 | ✅ 墙壁浮雕+高光线 |

## 项目结构

```
algorithm-visualizer/
├── src/
│   ├── algorithms/              # 算法步骤生成（纯逻辑，不依赖 DOM）
│   │   ├── sorting.ts           #   冒泡排序、快速排序
│   │   ├── dijkstra.ts          #   Dijkstra 最短路径
│   │   ├── huffman.ts           #   哈夫曼树构造
│   │   ├── maze.ts              #   迷宫 DFS 回溯
│   │   └── *.test.ts            #   单元测试（4 文件 17 用例）
│   ├── core/
│   │   └── algorithmEngine.ts   #   策略模式 + 注册表
│   ├── renderers/
│   │   ├── canvas/              #   Canvas 2D 渲染器（4 个）
│   │   ├── d3/                  #   SVG/D3 增强渲染器（4 个）
│   │   ├── types.ts             #   渲染器接口
│   │   └── rendererFactory.ts   #   渲染器工厂
│   ├── views/                   # 页面视图（6 个）
│   ├── components/              # 通用组件（播放控制栏 + AI 助手）
│   ├── stores/                  # Pinia 状态管理
│   ├── ai/                      # AI 助手模块（服务 / 流式 / 知识库 / Markdown）
│   ├── workers/                 # Web Worker
│   ├── services/                # Worker 客户端
│   ├── composables/             # 组合式函数（播放状态机 / 主题切换）
│   ├── utils/                   # 工具（rAF 调度 / 事件总线 / storage / 对象池 / 性能监控）
│   ├── types/                   # TypeScript 类型定义
│   ├── router/                  # 路由配置
│   ├── App.vue                  # 根组件（侧边栏 + 启动动画 + AI 助手）
│   ├── main.ts                  # 入口文件
│   └── style.css                # 全局设计令牌（CSS 变量 + 三主题 + 响应式）
├── public/                      # 静态资源
├── index.html                   # HTML 入口（lang="zh-CN"）
├── vite.config.ts               # Vite 构建配置
├── tsconfig.json                # TypeScript 严格模式配置
└── package.json                 # 项目依赖与脚本

总计：50+ 源文件，~9000 行代码
```

## 浏览器兼容性

- Chrome >= 90
- Edge >= 90
- Firefox >= 90
- Safari >= 15
