---
name: 星轨数字人
description: 日光放映室里的清楚表达与真实创作预览
colors:
  paper: "#f6f7f2"
  mint: "#e3eee2"
  pine: "#173f35"
  pine-dark: "#113329"
  ink: "#1b342e"
  body: "#52685c"
  line: "#d6ded3"
  coral: "#ff795e"
  coral-hover: "#ff8c74"
  white: "#fff"
typography:
  display:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "clamp(3.75rem, 7.05vw, 6rem)"
    fontWeight: 650
    lineHeight: 1.36
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "clamp(2rem, 3.6vw, 3.3rem)"
    fontWeight: 650
    lineHeight: 1.38
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "17px"
    fontWeight: 550
    lineHeight: 1.6
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.9
  body-small:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  button:
    fontFamily: '"Xinggui Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 600
  wordmark:
    fontFamily: '"Bricolage Grotesque", sans-serif'
    fontSize: "clamp(5rem, 17.3vw, 15.7rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.04em"
rounded:
  caption: "4px"
  paper: "5px"
  field: "7px"
  control: "8px"
  screen: "12px"
  media: "14px"
  circle: "50%"
spacing:
  tight: "8px"
  compact: "12px"
  control: "16px"
  regular: "24px"
  broad: "28px"
  section: "112px"
components:
  button-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.pine-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    height: "54px"
  button-coral-hover:
    backgroundColor: "{colors.coral-hover}"
  button-dark:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    height: "54px"
  button-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pine}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
    height: "54px"
  button-paper-hover:
    backgroundColor: "{colors.mint}"
  application-field:
    textColor: "{colors.pine}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
    height: "52px"
    width: "100%"
  subtitle-option:
    backgroundColor: "{colors.white}"
    textColor: "{colors.body}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 9px 10px"
  subtitle-option-selected:
    textColor: "{colors.pine}"
  format-tag:
    textColor: "{colors.body}"
    typography: "{typography.label}"
    rounded: "{rounded.paper}"
    padding: "6px 12px"
  screening-container:
    rounded: "{rounded.media}"
---

# Design System: 星轨数字人

## Overview

**Creative North Star: "日光放映室"**

“日光放映室”以明亮、沉静的底色托住真实人物影像。薄荷绿与纸白像自然光下的工作材料，松针绿提供清楚的阅读重心，珊瑚色让操作、选中状态和键盘焦点容易找到。整体气质亲近、克制，留白充足，信息在需要操作的区域适度变密。

中文内容是主要阅读层，较大的标题与宽松行距让创作说明保持清楚；拉丁字标和数字使用更有轮廓感的 Bricolage Grotesque。边框、裁切、圆角和少量柔和阴影组织材料，不把每条信息都装进浮起的卡片。运动服务于片段、字幕和状态的连续变化，人物始终留在稳定的画框中。

**Key Characteristics:**

- 薄荷与纸白的日光底色，松针绿的阅读层。
- 清楚的中文层级与有轮廓感的拉丁字标。
- 细线分隔、矩形画框、适度柔和的圆角。
- 珊瑚色的操作反馈与可见焦点。
- 稳定预览、可逆选择、可暂停的自动动态。

## Colors

配色以明亮的绿灰中性色为基底，深松针绿建立阅读与控制层级，珊瑚色提供温暖而明确的反馈。精确值以文首令牌为准。

### Primary

- **松针绿（pine）：** 主按钮、深色工作区域、品牌图形与高强度文字的核心色。
- **深松针绿（pine-dark）：** 珊瑚按钮和浅色轨道上的深色文字。

### Secondary

- **珊瑚（coral）：** 主要创作操作、流程选中线、光标提示与可见焦点。
- **浅珊瑚（coral-hover）：** 珊瑚按钮的悬停反馈。

### Neutral

- **日光纸白（paper）：** 页面、导航、浅色按钮与深色区域中的亮色文字。
- **薄荷（mint）：** 大面积安静底色与纸白按钮的悬停表面。
- **墨绿（ink）：** 默认阅读文字。
- **灰绿（body）：** 说明、辅助信息、标签及弱化文字。
- **雾绿细线（line）：** 内容分隔与容器边界。
- **纯白（white）：** 字幕样式选项与深色交互区域中的高亮文字。

### Named Rules

**The Coral Signal Rule.** 珊瑚色承担操作、选中指示与焦点提示；长段阅读使用墨绿或灰绿。

## Typography

**Display Font:** Xinggui Sans，后备为 Noto Sans SC、Microsoft YaHei、sans-serif。

**Body Font:** 同一中文字体栈。Xinggui Sans 是本地 Noto Sans SC 变量字体子集，支持实际加载的字重范围（400–800）；更新中文文案时需要重新生成子集。

**Latin / Numeric Font:** Bricolage Grotesque，后备为 sans-serif。

**Character:** 中文字面清楚、标题紧凑、正文舒展；拉丁字形的轮廓感提供品牌识别。页面采用响应式字号，没有单一等比字号阶梯。

### Hierarchy

- **Display：** 主要展示标题，字重（650）、行高（1.36）；默认响应式尺寸与字距见令牌。
- **Headline：** 区域标题，字重（650）、行高（1.38），窄屏调整为字号（31px）与行高（1.45）。
- **Title：** 能力条目标题，字重（550）、行高（1.6）；较大流程说明标题另用响应式字号（clamp(1.6rem, 2.6vw, 2.25rem)）与字重（500）。
- **Body：** 较显著的说明使用标准正文；辅助说明使用小正文。正文宽松行高（1.9），能力和问答说明可达（2）。能力说明的最大宽度（370px），流程说明最大宽度（365px）。
- **Label：** 导航、控制标签、状态与技术信息。控制组标题可提升至字号（13px）与字重（550）。
- **Button：** 清楚的操作文字，字重（600）。紧凑按钮字号（13px），窄屏主要控制多使用字号（12px）。
- **Wordmark：** 仅拉丁品牌展示，字重（600）、行高（1.25）；数字阶段标记使用 Bricolage Grotesque 字号（12px）。

### Named Rules

**The Chinese Reading Rule.** 中文正文使用 Xinggui Sans 字体栈与宽松行距；Bricolage Grotesque 用于拉丁字标、数字和比例标记。

## Layout

使用居中的宽幅容器，最大宽度（1256px）。默认两侧留白（56px）；视口不超过（1199px）时变为（36px），不超过（959px）时变为（28px），不超过（719px）时变为（20px）。区域默认上下间距使用 section 令牌，在中等视口缩为（90px），窄屏缩为（68px）。

正文与操作区域使用成对的列和明确的水平分隔。默认预览工作区采用（1.05fr / 1fr），流程面板采用等宽双列；宽度不超过（719px）时改成纵向，预览置于编辑控件之前。四项流程仍保持四列，文字与编号在列内换行；人物选项从纵向列表变成三列。无需依赖横向溢出来容纳控制。

顶部导航默认横排，在不超过（719px）时使用可展开导航。header 默认高度（94px），中等视口（82px），窄屏（75px）。窄屏压缩装饰与间距，保留主要操作与动效开关。最窄调整边界为（419px）；超宽视口边界为（1500px）。

常见局部间距以文首实际复用的间距为准。组件可使用内容驱动的间距，避免将单个区域的精确构图变成所有页面的模板。

## Elevation & Depth

深度来自浅深底色、薄边框、影像裁切和少量柔和投影。内容列表与问答保持平面，旋转与叠放属于媒体和创作文稿的材料表达。阴影使用扩散的负扩张投影，没有硬偏移投影。

### Shadow Vocabulary

- **影像叠放：**（`0 22px 38px -18px rgb(0 0 0 / 22%)`）用于人物画框。
- **浮动字幕：**（`0 12px 25px -10px rgb(0 0 0 / 16%)`）用于悬在画框之上的字幕材料。
- **临时提示：**（`0 9px 25px -9px rgb(0 0 0 / 18%)`）用于短暂状态反馈。
- **影像入场起点：**（`0 8px 15px -10px rgb(0 0 0 / 12%)`）仅属于画框入场过渡。

### Named Rules

**The Media Depth Rule.** 柔和投影主要属于叠放的影像、浮动字幕和临时提示；正文、能力列表和问答依靠底色与细线建立层次。

## Shapes

基本形状是柔和圆角的矩形。较大的媒体与工作区使用 media 圆角，竖屏预览使用 screen 圆角；按钮与选择控件使用 control 圆角，申请字段使用 field 圆角，标签与纸张使用 paper 圆角，字幕底片使用 caption 圆角。播放控制、状态点与轨道标识使用圆形，椭圆轨道属于品牌图形。

边界通常是细线（1px）。画框保留人物影像的矩形比例，竖屏预览使用比例（9 / 16）。细小的取景角标和线性 SVG 图标呼应画框，图标以 currentColor 描边，不使用文字字符代替图标。

## Components

### Buttons

明确、平静的矩形控制。

- **Shape：** control 圆角；常规最小高度（54px）、内边距（14px 24px）、图文间距（26px）。文首组件 height 记录标准最小高度；实现应允许内容撑高。
- **Primary：** 珊瑚底配深松针绿文字。用于主要创作操作。
- **Dark：** 松针绿底配纸白文字；悬停底色是源码中的（#2a5c48），属于该状态的局部值。
- **Paper：** 纸白底配松针绿文字；悬停转为薄荷底。
- **Hover / Focus：** 颜色过渡（180ms）；箭头在（250ms）内向右上偏移（2px）。键盘焦点采用珊瑚描边（3px），常规偏移（5px）。
- **Compact：** 最小高度（44px）、内边距（11px 19px）；移动端再按空间收紧。

### Chips / Tags

信息标签使用安静的浅绿底，纸张圆角与小字号，不伪装成可操作按钮。字幕样式选择则是有边框的 control 圆角按钮，选中时深绿边框、深绿文字与浅绿底共同表达状态，并通过 `aria-pressed` 声明选择。

### Cards / Containers

工作区以 media 圆角和细线边界包住控制与预览，内部采用不同浅色底区分功能。它本身没有外投影。桌面控制区内边距（38px 38px 30px），窄屏收紧并移动到预览下方。文稿示意是小圆角纸张，保留轻微旋转与标注；不要把这种纸张表现扩散到普通内容条目。

### Inputs / Fields

申请字段使用半透明纸白底、灰绿描边、field 圆角，标准高度（52px）、内边距（12px 16px）。聚焦时描边转松针绿，键盘焦点仍可见。演示文案框使用 control 圆角、浅绿灰底、内边距（17px 19px）、行高（1.9），支持纵向调整大小。

标签始终可见。邮箱字段使用浏览器真实校验；提交后只显示草稿已准备的结果。申请结果有可查看的文本、邮件动作与复制动作，反馈描述实际结果。源码没有独立的自定义错误色系，不应从本页面推导新状态令牌。

### Navigation

横向导航使用灰绿小字，悬停转为松针绿并显示下划线；页内链接保留键盘焦点。窄屏导航由具有 `aria-expanded` 的菜单按钮展开，选择链接、点击外部或按 Escape 后关闭。关闭时恢复相应图标与标签。

### Workflow Tabs

松针绿背景上的四列流程控制，以编号、文字与珊瑚色底线同时表示选中项。选中线过渡（350ms），相邻面板在（340ms）内以轻微位移和透明度进入。方向键、Home、End 与点击均可选择；一次只展示一个关联面板，状态使用 `aria-selected` 和 roving tabindex。

### Screening Preview

预览保留同一（9 / 16）画框。人物选择先等待新海报解码，再更换真实参考视频与海报。切换期间保留完整的上一帧，置于字幕与控制之下，并在（340ms）内从不透明淡出；页面暂停动态或系统减少动态效果时缩为（100ms）。文案输入立即更新覆盖字幕；字幕选择改变文字处理，不声称触发在线生成。默认字幕使用深绿半透明底片以维持影像上的可读性；重点和电影样式是局部演示样式。

同一时间只播放一个静音参考片段。预览播放由访客触发，媒体离开视口或页面隐藏时暂停；自动媒体服从减少动态效果与页面暂停偏好。细指针的轻微视差只作用于影像组合。静态海报与错误重试保留可理解状态。

### Disclosure / Feedback

问答使用原生 details / summary、上下细线和线性加号；展开后图标旋转（45deg）。复制和草稿准备使用状态文本及短暂提示，提示持续（4s），不以动画暗示未发生的提交。

## Do's and Don'ts

### Do:

- **Do** 使用松针绿与灰绿区分标题、正文和辅助信息。
- **Do** 保持正文的宽松行距，并在窄屏重排内容与控制区。
- **Do** 给键盘可操作元素保留珊瑚色可见焦点。
- **Do** 在同一个画框内切换人物与字幕，并保留明确的选中状态。
- **Do** 支持减少动态效果、暂停自动动效和显式播放。
- **Do** 明确标注参考素材、示意状态与邮件草稿的实际结果。

### Don't:

- **Don't** 把字幕专用的黄色、黑色遮罩或衬线样本提升为通用阅读样式。
- **Don't** 给普通内容列表套用影像叠放的投影和旋转。
- **Don't** 以拉丁展示字体替代中文正文的阅读字体。
- **Don't** 只用颜色表达人物、字幕或流程选中状态。
- **Don't** 把界面预览描述为在线生成结果，或把邮件草稿描述为已发送申请。
