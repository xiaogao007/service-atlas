# 服务地图 UI 设计基线

2026-10-09 用户确认采用参考系统的浅色工作台风格，并要求直接应用到当前项目。

唯一完整视觉规范为 [ui-prototype/DESIGN.md](ui-prototype/DESIGN.md)，运行时主题值由 [theme.css](ui-prototype/dist/theme.css)统一提供，页面与组件样式由 [styles.css](ui-prototype/dist/styles.css)消费。后续正式前端沿用这套颜色、文字层级、尺寸与交互规则；新增页面复用共享组件，不另设页面专属主题。

核心结构是 72px 浅灰导航、白色主工作区、400px 上下文面板；黑灰文字、深灰主按钮、16px 卡片、24px 弹窗，少量淡色图标与语义状态色。宽度不足时收起上下文面板，服务详情按需打开。标准正文与控件 14px，辅助信息至少 12px。

当前落地覆盖产品台账、产品详情、待整理、服务器、操作历史、设置，以及服务详情、日志、表单和受控重启弹窗。可运行入口为 `ui-prototype/dist/index.html`；当前数据与远程动作均为模拟。真实服务能力、持久化与安全验收仍按产品文档实施。

修改视觉时同步主题、完整规范与浏览器验证；修改业务流程时同步 [体验规格](02-experience-and-flows.md)和[验收标准](05-delivery-and-acceptance.md)。技术栈默认决策保持 Go、React、TypeScript、Vite、Ant Design、SQLite，现有无构建依赖原型用于视觉与交互评审。
