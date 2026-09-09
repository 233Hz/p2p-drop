STYLEKIT_STYLE_REFERENCE
style_name: macOS 毛玻璃
style_slug: macos-vibrancy
style_source: /styles/macos-vibrancy

# Hard Prompt

## 什么时候用
当你希望 AI 严格按风格规则生成代码时使用。它是生产界面最稳的默认选择。

## 怎么用
- 把完整提示词复制到 ChatGPT、Claude、Cursor 或其他编码助手。
- 在提示词后追加具体产品、页面或组件需求。
- 生成后按禁止项和交互状态检查，确认没有风格漂移。

请严格遵守以下风格规则并保持一致性，禁止风格漂移。

## 执行要求

- 优先保证风格一致性，其次再做创意延展。
- 遇到冲突时以禁止项为最高优先级。
- 输出前自检：颜色、排版、间距、交互是否仍属于该风格。

## Style Rules

你是一位专精于 macOS Vibrancy 风格的前端开发专家。所有代码都必须遵循以下规范：

## 绝对禁止

- No gradients on any element (backgrounds are solid dark grays)
- No glow effects, no box-shadow larger than 2px spread
- No decorative animations (pulse, bounce, spin)
- No rounded-3xl or rounded-full (max rounded-xl)
- No bright accent colors as backgrounds (only for text highlights)
- No borders thicker than 1px

## 必须遵守

- Use three-depth dark gray system: #1c1c1e (deepest) -> #2c2c2e -> #3a3a3c (lightest)
- Sidebar uses backdrop-blur-xl with bg-[#1c1c1e]/80 for vibrancy effect
- All borders are 1px border-white/8 to border-white/12, never thicker
- Headings use serif font (Georgia, serif), body uses system sans-serif
- Transitions are subtle: duration-200 ease-out, colors only
- Active nav items use slightly lighter background bg-white/8 to bg-white/12
- Code blocks use monospace font with bg-[#1c1c1e] background
- System accent color #0a84ff for interactive highlights

## 绝对规则

- 背景色只能从三级深度系统中选取：#1c1c1e（最深）、#2c2c2e（中间）、#3a3a3c（表面）
- 任何元素都不使用渐变
- 不使用发光效果或大尺寸阴影
- 不使用装饰性动画
- 所有边框都是 1px，透明度在 white/8 到 white/12 之间
- 圆角最大只到 rounded-xl，禁止使用 rounded-3xl 或 rounded-full
- 过渡只作用于颜色，duration-200，ease-out

## 排版

- 标题：衬线字体（Georgia、"Times New Roman"、serif）
- 正文：系统无衬线字体（-apple-system、BlinkMacSystemFont、sans-serif）
- 代码：等宽字体（SF Mono、Menlo、monospace）
- 文字颜色：white/95（主要）、white/70（次要）、white/40（弱化）

## 布局

- 三栏结构：侧边栏（最深）| 中间面板 | 内容区（最浅）
- 侧边栏：bg-[#1c1c1e]/80 backdrop-blur-xl，border-r border-white/8
- 中间面板：bg-[#2c2c2e]，border-r border-white/8
- 内容区：bg-[#2c2c2e] 或 bg-[#3a3a3c]

## 交互

- Hover：背景轻微提亮（bg-white/5 到 bg-white/8）
- 激活态导航项：bg-white/10 配 text-white/95
- Focus：border-white/25 或使用强调色的 ring
- 不使用 hover 上浮，不使用缩放变换

## 自检

1. 任何位置都没有渐变
2. 阴影不超过 2px
3. 只使用 1px 边框
4. 正确使用三级深度灰阶系统
5. 标题用衬线字体，正文用无衬线字体
6. 过渡效果克制（duration-200，只针对颜色）

---

# macOS Vibrancy (macOS 毛玻璃) Design System

> macOS 原生暗色毛玻璃风格。通过多层深灰面板、系统级 backdrop-blur 和极度克制的装饰，还原桌面应用的沉稳质感。

## 核心理念

macOS Vibrancy 是 Apple 桌面应用设计语言的 Web 还原。它的核心不是炫技，而是克制。

核心理念：
- 层级即色彩：不用渐变和发光，纯靠背景深浅区分层级（#1c1c1e -> #2c2c2e -> #3a3a3c）
- 系统级模糊：侧边栏使用 backdrop-blur 让底层内容微微透出，模拟 NSVisualEffectView
- 排版驱动：衬线标题 + 无衬线正文 + 等宽代码，三种字体各司其职
- 1px 哲学：所有分隔都是 1px 半透明边框，不用阴影制造深度
- 无装饰主义：没有渐变、没有发光、没有动画，内容本身就是装饰

设计原则：
- 视觉一致性：所有组件必须遵循统一的视觉语言，从色彩到字体到间距保持谐调
- 层次分明：通过颜色深浅、字号大小、留白空间建立清晰的信息层级
- 交互反馈：每个可交互元素都必须有明确的 hover、active、focus 状态反馈
- 响应式适配：设计必须在移动端、平板、桌面端上保持一致的体验
- 无障碍性：确保色彩对比度符合 WCAG 2.1 AA 标准，所有交互元素可键盘访问

---

## Token 字典（精确 Class 映射）

### 边框
```
宽度: border
颜色: border-white/10
圆角: rounded-xl
```

### 阴影
```
小: shadow-none
中: shadow-[0_1px_0_rgba(255,255,255,0.05)]
大: shadow-[0_2px_8px_rgba(0,0,0,0.3)]
悬停: hover:shadow-none
聚焦: focus:shadow-[0_0_0_2px_rgba(100,100,255,0.3)]
```

### 交互效果
```
悬停位移: （无）
悬停缩放: （无）
悬停透明度: hover:bg-white/8
过渡动画: transition-colors duration-200 ease-out
按下状态: active:opacity-80
```

### 字体
```
标题: font-serif font-semibold text-white/95
正文: text-white/70
等宽: font-mono text-white/80
```

### 字号
```
Hero: text-3xl md:text-5xl
H1: text-2xl md:text-4xl
H2: text-xl md:text-2xl
H3: text-lg md:text-xl
正文: text-sm
小字: text-xs
```

### 间距
```
Section: py-12 md:py-16
容器: px-4 md:px-6
卡片: p-4 md:p-6
小间距: gap-2
中间距: gap-4
大间距: gap-6
```

### 颜色角色
```
背景主色: bg-[#1c1c1e]
背景辅色: bg-[#2c2c2e]
背景强调色: bg-[#3a3a3c], bg-blue-600, bg-indigo-600
正文主色: text-white/95
正文辅色: text-white/70
正文弱化色: text-white/40
按钮主色: bg-[#3a3a3c] text-white/90
按钮辅色: bg-transparent text-white/70 border border-white/12
```

---

## [FORBIDDEN] 绝对禁止

以下 class 在本风格中**绝对禁止使用**，生成时必须检查并避免：

### 禁止的 Class
- `bg-gradient-to-r`
- `bg-gradient-to-br`
- `bg-gradient-to-l`
- `shadow-xl`
- `shadow-2xl`
- `shadow-lg`
- `rounded-3xl`
- `rounded-full`
- `text-yellow-400`
- `text-pink-500`
- `text-green-400`
- `animate-pulse`
- `animate-bounce`
- `border-2`
- `border-4`

### 禁止的模式
- 匹配 `^bg-gradient`
- 匹配 `^shadow-(xl|2xl|lg)$`
- 匹配 `^rounded-(3xl|full)$`
- 匹配 `^animate-`
- 匹配 `^border-[2-9]$`

### 禁止原因
- `bg-gradient-to-r`: macOS Vibrancy uses solid dark backgrounds, not gradients
- `shadow-xl`: macOS Vibrancy uses minimal shadows, depth comes from background layers
- `rounded-3xl`: macOS Vibrancy uses moderate rounding (rounded-lg to rounded-xl)
- `animate-pulse`: macOS Vibrancy avoids decorative animations
- `border-2`: macOS Vibrancy uses 1px borders only

> WARNING: 如果你的代码中包含以上任何 class，必须立即替换。

---

## [REQUIRED] 必须包含

### 按钮必须包含
```
bg-[#3a3a3c] text-white/90
rounded-lg
transition-colors duration-200
```

### 卡片必须包含
```
bg-[#2c2c2e]
border border-white/8
rounded-xl
```

### 输入框必须包含
```
bg-[#1c1c1e]
border border-white/10
rounded-lg
text-white/90 placeholder-white/30
focus:outline-none focus:border-white/25
transition-colors duration-200
```

---

## [COMPARE] macOS Vibrancy 错误 vs 正确对比

以下错误示例只代表“未经过当前风格适配的通用默认值”，不要把错误示例当成视觉建议。

### 按钮

[WRONG] **错误示例**（通用组件库默认样式，不要直接复制）：
```html
<button class="{GENERIC_LIBRARY_BUTTON_DEFAULT}">
  点击我
</button>
```

[CORRECT] **正确示例**（使用当前风格的 token）：
```html
<button class="bg-[#3a3a3c] text-white/90 rounded-lg transition-colors duration-200 bg-[#3a3a3c] text-white/90">
  点击我
</button>
```

### 卡片

[WRONG] **错误示例**（未经当前风格适配的通用卡片）：
```html
<div class="{GENERIC_LIBRARY_CARD_DEFAULT}">
  <h3>{TITLE}</h3>
</div>
```

[CORRECT] **正确示例**（使用当前风格的 card token）：
```html
<div class="bg-[#2c2c2e] border border-white/8 rounded-xl p-4 md:p-6">
  <h3 class="font-serif font-semibold text-white/95 text-lg md:text-xl">{TITLE}</h3>
</div>
```

### 输入框

[WRONG] **错误示例**（未经当前风格适配的通用输入框）：
```html
<input class="{GENERIC_LIBRARY_INPUT_DEFAULT}" />
```

[CORRECT] **正确示例**（使用当前风格的 input token）：
```html
<input class="bg-[#1c1c1e] border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors duration-200" placeholder="{PLACEHOLDER}" />
```

---

## [TEMPLATES] macOS Vibrancy 页面骨架模板

以下骨架只使用当前风格的 token。替换 `{PLACEHOLDER}` 时，不要移除或替换这些 token：

### 导航栏骨架
```html
<nav class="bg-[#1c1c1e] text-white/95 border border-white/10 px-4 md:px-6">
  <div class="flex items-center justify-between max-w-6xl mx-auto gap-4">
    <a href="/" class="font-serif font-semibold text-white/95 text-lg md:text-xl">
      {LOGO_TEXT}
    </a>
    <div class="flex gap-4 text-white/70 text-xs">
      {NAV_LINKS}
    </div>
  </div>
</nav>
```

### Hero 区块骨架
```html
<section class="bg-[#3a3a3c] text-white/95 py-12 md:py-16 px-4 md:px-6">
  <div class="max-w-4xl mx-auto">
    <h1 class="font-serif font-semibold text-white/95 text-3xl md:text-5xl">
      {HEADLINE}
    </h1>
    <p class="text-white/70 text-sm max-w-xl">
      {SUBHEADLINE}
    </p>
    <button class="bg-[#3a3a3c] text-white/90 rounded-lg transition-colors duration-200 bg-[#3a3a3c] text-white/90">
      {CTA_TEXT}
    </button>
  </div>
</section>
```

### 卡片网格骨架
```html
<section class="bg-[#1c1c1e] text-white/95 py-12 md:py-16 px-4 md:px-6">
  <div class="max-w-6xl mx-auto">
    <h2 class="font-serif font-semibold text-white/95 text-xl md:text-2xl">{SECTION_TITLE}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Card template - repeat for each card -->
      <div class="bg-[#2c2c2e] border border-white/8 rounded-xl p-4 md:p-6">
        <h3 class="font-serif font-semibold text-white/95 text-lg md:text-xl">{CARD_TITLE}</h3>
        <p class="text-white/70 text-sm text-white/40">{CARD_DESCRIPTION}</p>
      </div>
    </div>
  </div>
</section>
```

### 表单输入骨架
```html
<input class="bg-[#1c1c1e] border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors duration-200" placeholder="{PLACEHOLDER}" />
```

### 页脚骨架
```html
<footer class="bg-[#2c2c2e] text-white/70 py-12 md:py-16 px-4 md:px-6">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <span class="font-serif font-semibold text-white/95 text-lg md:text-xl">{LOGO_TEXT}</span>
        <p class="text-white/70 text-xs">{TAGLINE}</p>
      </div>
      <div>
        <h4 class="font-serif font-semibold text-white/95 text-lg md:text-xl">{COLUMN_TITLE}</h4>
        <ul class="text-white/70 text-xs">
          {FOOTER_LINKS}
        </ul>
      </div>
    </div>
  </div>
</footer>
```

---

## [CHECKLIST] macOS Vibrancy 生成后自检清单

**输出代码前，逐项验证当前风格的 token 和规则。如有违反，先修正再交付：**

### Token 检查
- [ ] 按钮包含： `bg-[#3a3a3c] text-white/90 rounded-lg transition-colors duration-200`
- [ ] 卡片包含： `bg-[#2c2c2e] border border-white/8 rounded-xl`
- [ ] 输入框包含： `bg-[#1c1c1e] border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors duration-200`

### 禁止项检查
- [ ] 没有使用 `bg-gradient-to-r`
- [ ] 没有使用 `bg-gradient-to-br`
- [ ] 没有使用 `bg-gradient-to-l`
- [ ] 没有使用 `shadow-xl`
- [ ] 没有使用 `shadow-2xl`
- [ ] 没有使用 `shadow-lg`
- [ ] 没有使用 `rounded-3xl`
- [ ] 没有使用 `rounded-full`

### 风格规则检查
- [ ] Use three-depth dark gray system: #1c1c1e (deepest) -> #2c2c2e -> #3a3a3c (lightest)
- [ ] Sidebar uses backdrop-blur-xl with bg-[#1c1c1e]/80 for vibrancy effect
- [ ] All borders are 1px border-white/8 to border-white/12, never thicker
- [ ] Headings use serif font (Georgia, serif), body uses system sans-serif
- [ ] Transitions are subtle: duration-200 ease-out, colors only

### 风格漂移检查
- [ ] 没有违反：No gradients on any element (backgrounds are solid dark grays)
- [ ] 没有违反：No glow effects, no box-shadow larger than 2px spread
- [ ] 没有违反：No decorative animations (pulse, bounce, spin)
- [ ] 没有违反：No rounded-3xl or rounded-full (max rounded-xl)
- [ ] 没有违反：No bright accent colors as backgrounds (only for text highlights)

### 通用交付检查
- [ ] 响应式布局在手机、平板和桌面下稳定，没有横向溢出
- [ ] 所有交互元素有清晰焦点、可访问名称和 reduced-motion 方案
- [ ] 文本对比度达到 WCAG AA，且没有用颜色单独传递状态
- [ ] 结果仍然能够一眼识别为 macOS Vibrancy

---

## [EXAMPLES] 示例 Prompt

### 1. macOS Settings App

macOS 风格的设置页面

```
Create a macOS Vibrancy settings page with:
1. Left sidebar: bg-[#1c1c1e]/80 backdrop-blur-xl, navigation items with icons
2. Active item: bg-white/10 rounded-lg
3. Main content: bg-[#2c2c2e], settings sections with 1px borders
4. Toggle switches, input fields, dropdown selects
5. All text white/95 for labels, white/60 for descriptions
6. No gradients, no shadows, no animations
```

### 2. Code Editor

macOS 风格的代码编辑器

```
Create a macOS Vibrancy code editor layout with:
1. File tree sidebar: bg-[#1c1c1e]/80 backdrop-blur-xl, tree items with indent
2. Editor area: bg-[#2c2c2e], monospace font, line numbers in white/30
3. Tab bar: bg-[#2c2c2e] border-b border-white/8, active tab slightly lighter
4. Status bar: bg-[#1c1c1e] border-t border-white/8, small text
5. All borders 1px, no shadows, no gradients
```

### 3. Chat Application

macOS 风格的聊天应用

```
Create a macOS Vibrancy chat app with:
1. Conversation list sidebar: bg-[#1c1c1e]/80 backdrop-blur-xl
2. Chat area: bg-[#2c2c2e], messages in bg-[#3a3a3c] rounded-xl
3. Input bar: bg-[#1c1c1e] border-t border-white/8
4. Search bar in sidebar: bg-[#1c1c1e] rounded-lg
5. Timestamps in white/40, names in white/90
6. No gradients, no glow, 1px borders only
```

## 绝对禁止（匹配即拒绝）

以下模式一旦出现，视为风格违规——不找借口，直接重写。

- gradients on any element (backgrounds are solid dark grays)
- glow effects, no box-shadow larger than 2px spread
- decorative animations (pulse, bounce, spin)
- rounded-3xl or rounded-full (max rounded-xl)
- bright accent colors as backgrounds (only for text highlights)
- borders thicker than 1px

## 自检清单（交付前逐条确认）

如果任何一条不通过，说明风格漂移了——修改后再交付。

- [ ] 没有紫色到蓝色的渐变
- [ ] 没有使用 Inter / Roboto / Geist 等过度使用的字体
- [ ] 没有嵌套卡片（卡片里面套卡片）
- [ ] 没有在彩色背景上放灰色文字
- [ ] 正文对比度满足 WCAG AA（≥4.5:1）
- [ ] 没有 bounce / elastic 缓动曲线
- [ ] 动效有 prefers-reduced-motion 备选方案
- [ ] 正文行宽不超过 65-75 个字符
- [ ] 没有单侧粗边框装饰（border-left/right accent stripe）
- [ ] 没有渐变文字（background-clip: text）
- [ ] 没有把玻璃态（glassmorphism）当作默认风格
- [ ] 没有 tiny uppercase tracked eyebrow 放在每个 section 标题上面
- [ ] no gradients on any element (backgrounds are solid dark grays)
- [ ] no glow effects, no box-shadow larger than 2px spread
- [ ] no decorative animations (pulse, bounce, spin)
- [ ] no rounded-3xl or rounded-full (max rounded-xl)
- [ ] no bright accent colors as backgrounds (only for text highlights)