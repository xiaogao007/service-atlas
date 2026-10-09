---
version: alpha
name: Service Atlas
description: "用户确认的浅色工作台 UI 基线，用于管理产品、服务器与服务入口。"
colors:
  primary: "#262626"
  background: "#FFFFFF"
  surface: "#F7F7F7"
  text: "#262626"
  secondary: "#595959"
  muted: "#737373"
  border: "#EBEBED"
  success: "#26764C"
  warning: "#94651D"
  danger: "#AD403A"
  focus: "#386FC0"
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    lineHeight: "1.6"
  mono:
    fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace'
    fontSize: "12px"
    lineHeight: "1.8"
rounded:
  DEFAULT: "10px"
  tab: "12px"
  card: "16px"
  panel: "24px"
spacing:
  rail: "72px"
  context: "400px"
  page-padding: "24px"
  card-gap: "16px"
  section-gap: "24px"
components:
  button:
    height: "40px"
    rounded: "10px"
  card:
    rounded: "16px"
    padding: "20px"
  dialog:
    rounded: "24px"
    padding: "26px"
---

# 服务地图视觉与交互规范

## Overview

参考为用户指定的 [电商 AI 工作台](https://studio-test.zw-ai.com/design)。2026-10-09 实测其 72px 导航、400px 助手栏、白色工作区、黑灰文字层级、分段导航、16px 卡片及 24px 输入容器圆角。当前原型按服务地图的业务重排内容，保留这些视觉特征。

面向维护 2–5 台 Linux 云服务器的管理员，首要任务是从产品或端口定位服务、整理归属、查看日志与核验有限重启。中文界面，时间使用 Asia/Shanghai；市场范围未限定。产品场景优先，正常列表紧凑清楚，风险与数据缺口完整呈现。

视觉签名是浅灰窄导航、白色主区、克制的圆角与右侧上下文面板。小型服务器连接插画由原生 SVG 绘制；配色用于少量产品图标和状态。避免监控大屏、密集的彩色指标卡、满屏渐变和厚重阴影。

2026-10-09 用户确认此风格并要求应用到当前项目。本文件是项目完整视觉规范，根目录 [DESIGN.md](../DESIGN.md)提供项目入口。当前运行界面未接入后端；业务规范仍以 [页面与流程](../02-experience-and-flows.md)为准，技术栈默认建议不变。

运行时 token 的唯一来源是 `dist/theme.css` 的 `:root`；`dist/styles.css` 消费主题值并实现布局与组件。本文件记录语义映射，修改系统值时两处一起更新。颜色 `primary` 对应 `--primary`，`background` 对应 `--canvas`，`text` 对应 `--ink`；其他色名与 CSS 变量同名。圆角对应 `--radius-control/tab/card/panel`。字体、尺寸、间距、滚动条、焦点、语义色、阴影和动效也统一定义。共享视觉由 `.button`、`.badge`、`.segmented`、`.table-shell`、`dialog` 消费，后续 Ant Design 实现应映射同一来源。

## Colors

白底承载内容，浅灰承载导航与次级容器，细边框区分可操作对象。主动作采用深灰，导航通过白底和字重表明选中，不依赖品牌蓝色。

参考页的辅助字为约 `#8C8C8C`，本原型加深至 `#737373`。绿、橙、红分别用于正向结果、需关注条件和明确失败；所有状态都同时使用文字。未知运行状态不渲染成红色停止。焦点环使用 `#386FC0`。仅提供浅色主题，强制颜色模式保留系统对比度与可操作滚动条。

## Typography

使用本地系统字体，避免远端字体引起加载与布局偏移。标题 24px/650，区块标题 18px/600，正文、标准控件和表格主信息 14px，辅助信息、技术值与紧凑控件 12px。计数角标与原型标签允许更小；关键状态、字段和风险说明保持至少 12px。地址、端口、路径和日志使用等宽字体，可换行或横向滚动。

## Layout

普通桌面：72px 导航 + 自适应内容 + 400px 上下文面板。1151–1279px 面板为 360px；1600px 以上主内容最大宽度 1240px，产品卡片三列。主区左右 24px，产品卡片间距 16px，区块间距 24–32px。产品初始按名称排序；展示固定演示集的全部匹配项，表格明确展示条数。

1150px 以下默认收起辅助面板，选择服务后显示可关闭的非模态侧栏。700px 以下导航变为 60px，产品卡片单列，服务详情占满导航以外内容；主操作与关闭入口仍可访问。数据表在自己的区域横向滚动。

文档拥有主区自然纵向滚动；导航与上下文面板粘附。右侧信息单独滚动，表格不给共享父级施加固定高度，长表单与弹窗仍可完整访问。插画、按钮与状态区预留尺寸。

## Elevation & Depth

普通卡片不使用阴影，依靠边框和留白组织。辅助查询提示允许极淡紫色阴影，弹窗使用统一 overlay 阴影。弹窗背景轻微模糊，采用原生 dialog 的模态机制管理背景与焦点。非模态服务侧栏只使用极淡左侧阴影。

## Shapes

控件 10px、标签页 12px、产品卡片 16px、弹窗 24px；层级不同的对象采用不同圆角。头像与状态点可使用圆形。图标采用同一组 1.7px 描边的原生 SVG，常规 20px，控件内 16px，导航附带文字标签。

## Components

共享实现位于 `dist/app.js`：`pageIntro`、`button`、`badge`、`searchControls`、`serviceTable`、`showModal`、`toast`。表格使用语义 table，单选由原生 select 负责；接受系统拥有的选项弹出层，不承诺复刻其内部样式。归属多选使用原生 checkbox。设置使用同一细边框卡片，服务器卡片保留连接、覆盖和时间的独立层级。

右侧面板随工作区显示整理、连接、操作结果或数据管理提示，服务选中后统一切换为详情。操作历史的结果筛选使用原生 button 与 aria-pressed，条数和筛选写入 URL，切换后焦点回到同一筛选控件；进行中仅包含提交、执行、核验阶段，结果未知单独保留。空结果提供回到全部记录的动作。

按钮具备 hover、focus-visible、pressed、disabled 状态；深灰主按钮用于安全主要动作，危险按钮仅用于重启和解锁的最终确认。繁忙操作展示明确阶段，不用假百分比。状态及反馈具备文字与 live region。原型使用本地即时搜索，无远程竞态；支持中文输入法合成后提交，并提供清除按钮。

产品新建、编辑共用表单与验证，使用 novalidate、关联标签、内联错误、首错误焦点和未保存内容提示。凭据输入不属于本次原型范围。原生 dialog 承担 focus trap、背景 inert 和 Escape 事件；关闭后恢复触发位置或主内容焦点。

服务分区通过可书签导航链接切换概览、入口、日志和操作，不伪装为缺少键盘模型的 ARIA tabs。右侧详情为非模态 complementary，不约束背景焦点。

交互过渡为 150–160ms，仅用于颜色与按压反馈；尊重 prefers-reduced-motion。操作结果以原型模拟的提交、执行、核验和结果阶段呈现。日志逐行追加不放入 live region，避免持续打断读屏。

产品文案直接陈述动作与结果。参考页的插画亲和感迁移到服务工作台，不添加未经需求定义的 AI 助手。运行、监听、健康、数据新鲜度分别展示。

## Do's and Don'ts

- 保留稳定对象、真实状态语义和人工归属；跨主机同端口独立展示。
- 用留白、文字与轻边框建立层级，只有少量状态需要颜色。
- 未知结果保持未知；只读核验不自动证明此前重启成功。
- 原型所有远程行为为模拟，不接受真实凭据，不连接服务器。
- 不添加产品级全部重启、共享 Nginx 重启或自动写操作重试。
- 不用禁用按钮替代后端鉴权；正式实现需重新验证安全与 API 契约。
