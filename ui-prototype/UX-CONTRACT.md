# 原型交互契约

本文件记录共享 UI 的归属与原型限制；业务规则来自 [产品需求](../01-product-requirements.md)和[页面与流程](../02-experience-and-flows.md)。视觉来源为 [DESIGN.md](DESIGN.md)。不重复定义真实后端策略。

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Table Selection | app.js serviceTable / state.selected | 02 §3.1、§4.2 | 当前全部匹配的固定演示集；筛选后清空 | browser-verification.md、tests/data.test.js |
| Select/Listbox | 原生 select，经 h 创建 | DESIGN.md Components | 接受操作系统拥有的 popup；不自建 listbox | browser-verification.md |
| Form | app.js field / showModal / requestClose | 02 §3、§6 | 创建、编辑、关联、模拟接入 | browser-verification.md |
| Scrollbar | dist/theme.css tokens / styles.css 全局 * | DESIGN.md Layout | 表格横向、服务侧栏与日志纵向 | browser-verification.md |
| Toast | app.js toast / index.html #toast | 02 §5、§6 | 普通操作反馈；关键失败同时留在面板 | browser-verification.md |
| CRUD | app.js openProduct / openAssign / hash routes | 02 §2、§3.1、§4.2 | 新建返回产品列表、编辑保留产品对象、关联更新待整理；无硬删除 | browser-verification.md、tests/data.test.js |

## 路由与状态

静态原型用 hash 路由表示产品、服务、待整理、服务器、操作历史和设置。搜索、服务器筛选、操作结果筛选、服务对象与详情分区写入 URL，返回恢复对应上下文。表单输入与日志不会写入 URL。页面与服务切换设置中文 document.title；未知路由提供应用内返回首页。

固定演示集展示全部匹配行，显示总量和唯一页。正式实现沿用原文档的 API 分页契约，不能把本地演示策略直接用于无界服务集。

新建、编辑与关联通过自有内联验证；提交失败保留输入。归属关联先整体校验再修改，避免部分成功。服务器首次接入展示模拟指纹并显式确认；不接收真实凭据。

重启禁用条件由共享 restartReason 决定；活动操作和未知结果阻断同机新写动作。结果未知需先只读核验；解锁显式确认，旧记录仍为 unknown。运行与探针核验语义来自 02 §4.5。本原型的演示场景选择器仅用于评审状态表现。

表单 Escape 或关闭触发未保存提示；native dialog 管理模态焦点，关闭恢复触发控件。服务详情是非模态侧栏。Tab、原生 select 键盘操作、复选框、按钮和链接保留标准行为。

## 已知范围

UI 状态只保存在当前页面会话。缺少真实 SSH、REST、SSE、鉴权与持久化，因此不能作为正式安全、性能、恢复或数据同步验收结果。所有地址、域名和日志使用模拟内容。手机与桌面布局在浏览器中核对，服务/操作失败恢复在模拟状态中验证。
