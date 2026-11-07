# 验证记录

日期：2026-09-07。环境：macOS、Node.js 22.12.0、Codex 内置 Chromium 浏览器。

## 自动化规则与战役

`npm test`：**21 项通过，0 失败，退出码 0**。

包含路径拐点与终点、有效建造与重复建造拒绝、拆除中继后的断电、容量按顺序分配、断开的设施不耗电也不开火、升级与退款上限、暂停冻结、双倍速、漏怪与失败、击杀只结算一次、波次奖励只结算一次且不自动开下一波、最终胜利、超频冷却与基座位置有效性。

其中新增 5 项双语测试，检查中英文文案完整性与参数一致性、静态绑定与所有设施/敌人/波次名称、已保存语言优先于浏览器偏好、存储不可用时正常运行，以及动态错误码与数字插值。

完整战役回归从正常初始状态开始，不修改资源与敌人数据，通过公开建造/升级接口逐波部署混合防线，成功击退 227 个敌人并通关。战斗模拟时间约 349 秒，不含准备阶段思考时间。仅保留免费起始炮塔的对照策略会失败，不能挂机通关。

## 构建

`npm run build`：退出码 0。

- 生成静态目录 `dist/`。
- 生成约 104 KB 的双语 `dist/last-beacon.html`。
- 对单文件内嵌脚本进行 `vm.Script` 编译检查，通过。
- 检查单文件不含外链脚本、样式、CDN 或远程资源引用，通过。
- 单文件通过本地 HTTP 静态服务加载，初始化与界面渲染正常。
- 内置浏览器的 URL 安全策略禁止 `file://` 导航，因此未在该浏览器中执行直接双击文件的实测。没有尝试绕过该限制。

## 浏览器交互

使用真实界面操作完成：

- 按正常预算建造哨戒炮与迫击炮，核对零件扣除和电网负载。
- 用聚焦在基座按钮上的 Space 启动波次；实际完成前两波并确认补给、修复、电力增加和手动开始下一波。
- 升级炮塔，核对等级、伤害、电力与花费。
- 在 390px 手机布局中建造远端炮塔，看到断电提示；建中继后立即供电；出售中继后下游再次断电。
- 暂停后打开重开弹窗，确认重开恢复新的部署阶段。
- 打开并关闭玩法说明；点击启用与关闭合成音效的按钮。开关状态正确，未进行音频录制或声学校验。
- 检查常见桌面尺寸与 390px 手机尺寸的布局，手机 DOM 宽度没有横向溢出，建造卡紧接战场。未在真实 iPhone/Android 设备上测试。
- 浏览器错误与警告日志未记录异常。

## 中英文切换

- 在真实界面中建造迫击炮，切换后即时提示和设施详情均使用目标语言。
- 第一波暂停时切换为英文，灯塔完整度仍为 100、零件仍为 80、电网仍为 8 / 12；波次、已建设施、选中设施等级及暂停状态均保留，波次横幅同步翻译。
- 英文玩法说明、重开确认及取消操作正常，关闭弹窗后保持之前的暂停状态。
- 刷新后仍显示手动选择的英文，页面标题和 `html lang` 同步更新。
- 检查 390px 和 700px 英文布局，DOM 宽度等于视口宽度，资源、建造卡和操作按钮没有横向溢出；电网文字正常显示。
- 单文件版通过本地 HTTP 加载，沿用已保存的语言。直接 `file://` 加载仍属于上面说明的未验证范围。
- 在英文单文件版中出售起始炮塔，按正常流程运行到第二波失败，实际显示英文结算及统计；关闭结算切回中文后，结算文案同步更新，波次与统计保持不变。此流程没有修改游戏状态或注入资源。
- 新增双语逻辑经独立只读代码审阅，没有遗留问题；两种语言的真实浏览器操作均未记录错误或警告。

## 独立代码审阅

对规则、控制器和离线构建进行了一次独立只读审阅，修复并针对性复查了：

1. 较矮窗口的侧栏内容覆盖底部操作区。
2. 窄屏重开按钮不可见。
3. 按钮聚焦时 Space 不执行游戏快捷键。
4. 重开后旧弹窗 close 事件恢复了上一局暂停状态。
5. 失败波次错误标记为已完成。

另修复了 Space 长按重复事件的默认行为，以及手机暂停遮罩挡住重开按钮的问题。

## 验证范围

自动战役验证使用真实规则和预算，不等于人工在浏览器逐波通关。浏览器实际玩过前两波；Boss 和最终胜负由规则测试及完整战役回归覆盖。当前没有真实多设备性能基准。

## 发布与正式域名

当前正式试玩：[last-beacon.pjstack.dev](https://last-beacon.pjstack.dev)。域名于 2026-10-10 更新；本次访问验证见文末记录。

Vercel 已完成生产部署。2026-09-07，创作者确认正式域名 [last-beacon.loupengju.cc](https://last-beacon.loupengju.cc) 可在未登录 Vercel 的浏览器中直接进入游戏。本轮联网读取工具未能打开该域名，因此正式域名免登录访问的结论来自创作者确认，未记为代理完成的线上试玩。

已向原清单仓库建立[草稿 PR #4](https://github.com/MartinDelophy/awesome-gpt-6-astra/pull/4)。该投稿分支的官网现有测试 27 项通过，实际解析中英文 README 均得到 4 款游戏和 1 个艺术沙盒，Last Beacon 的分类、作者、试玩与源码链接正确。

## 2026-09-25 · 三维重制与新玩法

环境：Linux 容器、Node.js 22.22.2、Playwright 1.56 驱动的无头 Chromium。无头浏览器没有独立显卡，WebGL2 由 SwiftShader 软件渲染（ANGLE / Vulkan），因此下文的画面检查可信，帧率不代表真实设备。

### 自动化测试与构建

`npm test`：**31 项通过，0 失败**。在原有 21 项基础上新增：电弧塔连锁目标数与逐跳衰减、三种索敌方式（含中继站不可设置与本局结束后拒绝修改）、裂殖体被击毁时分裂且奖励各结算一次、漏怪时不分裂、灯塔聚光的蓄能延迟 / 范围 / 致盲停步与恢复 / 冷却 / 只能在战斗中使用、聚光伤害与敌人强度使用同一波次系数、无尽潮汐只能在胜利后开启且波次与电网上限正确、三档难度的起始零件 / 敌人强度 / 漏怪损伤、战斗事件携带地图坐标，以及同一套防线在困难难度下失败。完整战役回归仍从正常初始状态开始、使用公开接口；新波次中的裂殖体使总击退数从 227 变为 247，标准难度下该防线仍零漏怪通关。

`npm run build`：生成 `dist/` 与约 991 KB 的 `dist/last-beacon.html`（14 个模块，其中 Three.js 约 740 KB）。构建脚本会检查每个导入名称都真实存在于对应模块、内联脚本可编译、页面不含外部脚本或样式引用；新增的构建测试重复验证这些条件。这项检查在开发中发现并修复了一个缺陷：`export const a=…,b=…;` 只导出了第一个名称，导致单文件版的三维视图初始化失败并回退到 2D。

### 平衡模拟

用脚本化策略在三档难度下各跑完整战役（均使用真实预算，不修改资源）：原测试防线、同一防线加自动聚光、通用自动玩家（混合 / 无电弧 / 电弧为主 / 只造哨戒炮 / 优先升级）、按覆盖率花光预算的专家策略。结论：

- 标准难度与原版一致：用同一批自动玩家对比改动前的规则，普通自动玩家都在第 10 波被深渊巨像击穿，优先升级的自动玩家和原测试防线通关，只留起始炮塔在第 4 波失败。
- 轻松难度下普通自动玩家均可通关；深渊巨像漏过只造成 75 点损伤。
- 困难难度下原测试防线失败，只有混合防线配合灯塔聚光的专家策略以 21 点完整度通关。
- 电弧塔初版偏弱，已把伤害调到 20、冷却 0.9 秒、衰减 0.65；无尽潮汐初版增长过陡，调整后专家策略可在标准难度坚持到第 19 波左右。

### 浏览器检查

- 桌面 1440×900、1280×800 与 900×600，手机 390×844：三维战场、建造卡、指挥面板与弹窗布局正常，手机 DOM 宽度等于视口，无横向溢出。修复了手机上建造卡图标偏移、工具按钮压住地名注释，以及较矮窗口下战斗统计被底部按钮遮住的问题。
- 通过真实界面操作验证：键盘选择设施并在基座建造、面板切换索敌与 `T` 键循环、`F` 进入瞄准后再按 `F` 自动瞄准、鼠标移动时地面瞄准圈跟随并点击释放、胜利后进入无尽潮汐（第 11 波、`/ ∞`、横幅与无尽波次名称）、无尽中失败的结算文案与纪录、在「重新出发」中选择困难难度（160 零件）、中英切换，以及画质在高 / 中 / 低 / 2D 间循环（每次都重建渲染器，页面始终只有一个战场画布）。
- `?view=2d` 的 2D 视图在中文界面下显示电弧塔、裂殖体、聚光蓄能圈与技能冷却状态。
- 单文件版通过 `file://` 直接打开，三维视图以高画质运行，页面没有外部资源引用。
- 以上检查的浏览器控制台均无错误或警告。
- 性能：只统计每帧的状态同步与特效更新（不含 GPU 绘制），第 10 波 25 个敌人、13 座设施时平均 0.36 ms、p95 0.8 ms；无尽第 30 波同时 59 个敌人（含 3 个深渊巨像）时中位数 0.4 ms、p95 1.3 ms。环境反射贴图重算已降为 128 像素并限制频率。

### 验证范围

没有在真实 GPU、iPhone 或 Android 设备上测量帧率；高画质的泛光与阴影成本以桌面独显为目标，手机默认中画质。音效与环境声只做了代码路径检查，没有录音或声学评估。自动化平衡模拟不等于人工逐波游玩；浏览器中实际操作的是上述流程，其余波次由规则测试与战役模拟覆盖。

## 2026-09-29 · 全屏界面、光束与夜战

环境与上一节相同：Linux 容器、Node.js 22.22.2、Playwright 驱动的无头 Chromium，WebGL2 由 SwiftShader 软件渲染。画面与交互检查可信，帧率和过渡动画的流畅度不代表真实设备。

### 自动化测试与构建

`npm test`：**37 项通过，0 失败**。新增：各波次与无尽潮汐的天空表（第 5、6、7、10 波为夜战）；光束落下前不照亮、在岛上以限定速度滑动、两波之间不计时、战斗中 12 秒后抬起、拒绝地图外目标与本局结束后的操作；被照亮的敌人受到炮塔伤害 +25%、移动减速 15%，聚光把光束压到落点而自身伤害不叠加加成；夜里炮塔只攻击夜间视野内、或被光束 / 灯塔 / 通电中继站照亮的远处敌人，电弧的跳跃同样只落在看得见的敌人身上（代码审阅指出的遗漏），深渊巨像始终可见，白天不受影响。完整战役回归改为守望者每 8 秒把光束放在领头敌人前方，结果仍是零漏怪通关、247 次击退；另一项确认从不放光束时同一防线会在第 10 波失守。

`npm run build`：`dist/last-beacon.html` 约 1024 KB（14 个模块）。

### 平衡模拟

三种光束玩家（从不、偶尔：每 8 秒照向领头敌人前方、积极：照向炮塔射程内最重的敌群）× 七种布防策略 × 三档难度，均使用真实预算并自动使用超频与聚光：

- 标准：不用光束时，原测试防线、优先升级的自动玩家和三种专家策略全部通关，普通混合自动玩家仍在第 10 波失败，与改动前一致；专家策略在夜里会损失一些完整度。只要偶尔放下光束，除只造哨戒炮以外的所有策略都以满完整度通关。
- 轻松：几乎所有策略通关。
- 困难：敌人强韧由 30% 提高到 45%，用来抵消光束带来的增益。不用光束时只有优先升级的自动玩家以 77 点完整度勉强通关，其余全部失败；使用光束时优先升级的自动玩家与三种专家策略通关，原测试防线与普通混合自动玩家失败。
- 参数经四轮扫描确定为夜间视野 70%、伤害 +25%、减速 15%。最初的 60% / +30% / 20% 会让不用光束的标准难度玩家在最后一波频繁失败，同时让困难难度过于轻松。

### 浏览器检查

- 桌面 1440×900、1280×820，手机 390×844，中英文界面：全屏战场与浮层、岛上建造环、设施菜单、引导气泡、日志抽屉、夜战、深渊巨像登场与胜利黎明镜头。手机上浮层不遮挡建造栏，页面不滚动。
- 用真实点击和键盘在 3D 与 2D 各走一遍：点击空基座打开建造环并建造迫击炮；点击设施打开菜单、升级、切换索敌；第一次点击地面只关闭菜单，第二次放下光束；`Tab` 聚焦基座后按 `Enter` 打开建造环且焦点进入菜单，数字键或空格在该基座建造，建成、升级或按 `Esc` 后焦点回到基座；用指针点过按钮后，空格仍然开波或暂停；`Space` 开波，`B` 自动照向敌群；`L` 开关日志。引导气泡按「选基座 → 开波 → 光束」推进，菜单打开时自动让开。
- 单文件版通过 `file://` 打开：三维视图、建造环图标正常，页面没有任何外部请求。
- 性能：夜战中 6 个敌人、9 座设施时，每帧状态同步与特效更新平均 0.30 ms、p95 0.80 ms（不含 GPU 绘制），与改动前持平。
- 以上检查的浏览器控制台均无错误或警告。

### 验证范围

没有在真实 GPU、iPhone 或 Android 设备上测量帧率与动画流畅度；软件渲染下每帧很慢，镜头运动和菜单展开动画只确认了起止状态。光束与夜战的音效只做了代码路径检查。平衡结论来自脚本化玩家，不等于人工逐波游玩。

## 2026-09-29 · 写实画面（第二期）

环境与上一节相同：Linux 容器、Node.js 22.22.2、Playwright 驱动的无头 Chromium，WebGL2 由 SwiftShader 软件渲染。画面检查可信；下面的渲染耗时只用于和改动前的版本做相对比较，不代表真实设备的帧率。

### 自动化测试与构建

`npm test`：**37 项通过，0 失败**。「战斗事件」一项新增断言：每次击倒都带有造成致命一击的武器（哨戒炮、迫击炮、寒潮、电弧或聚光），每次命中都带有开火位置，供画面决定倒地方式和后仰方向。游戏规则与平衡没有改动。

`npm run build`：`dist/last-beacon.html` 约 1056 KB（14 个模块）。

### 浏览器检查

- 固定机位、隐藏浮层的前后对比：默认视角、低角度海岸、近景战斗、夜战、风暴。海岸从一圈均匀的陡坎变为北岸悬崖、南岸沙滩和滑道两侧的小海滩；树木、岩石、基座和远景都换成新模型。
- 近景受击与倒地：同一排 8 只爬行者、疾行者和甲壳兽分别被枪炮、寒潮、电弧、炮击击倒，按 0.18 / 0.68 / 1.03 / 1.73 秒截图。被枪炮打死的翻倒并踢腿后沉下；被冻住的罩上冰壳，约 0.9 秒碎成冰渣；被电弧打死的变黑、腿缩起、冒烟后化成灰；被炮击打死的直接炸碎。命中与爆炸的后仰、弹起在同一组截图中检查。
- 光与天气：黑夜里把镜头转向月亮，海面出现细碎的月光路径；夕阳下太阳在海平线铺出金色光路，灯塔灯光在近岸水面碎成闪光；风暴中光柱里有雨丝，道路车辙里有积水；三次炮击和一次聚光后，焦痕带着闪烁的火星，4.5 秒后火星熄灭而焦痕仍在，这一波结束后约 6 秒淡去，焦痕范围内的草被压倒烧黑、树被熏焦。
- 音效：开启声音后，在 3D 和 2D 视图中各触发开波雾笛、五种武器的击倒声、冰壳碎裂和雷声，均无报错。
- 单文件版通过 `file://` 打开：三维视图、引导气泡、建造环图标正常，页面没有任何外部请求。
- 以上检查的浏览器控制台均无错误或警告。

检查中发现并修正的问题：

- 冻住的敌人起初只是泛蓝，看不出结冰，因此加上了半透明冰壳。
- 火星起初是成片的橙色色块，像颜料，改为细小、闪烁的火点；焦痕外缘加了放射状纹路。
- 夜里海面上出现几团很大的白色光斑。逐个关闭光源后确认，它们来自主光源的镜面高光：主光源只负责照亮地形，方向并不在画面里月亮的位置。现在海面不再显示主光源的镜面高光，改为朝真实的太阳或月亮方向画出闪光路径；生成环境反射时也压暗月盘，避免它在海面上被模糊成一团。
- 软件渲染计时显示，加入 24 个焦痕槽位后，地形每帧的着色时间增加约一半：着色器每个像素都要遍历全部槽位。现在焦痕与中继站灯光都紧凑地排在数组前部，着色器只遍历实际存在的数量。

### 性能

每帧状态同步与特效更新（不含 GPU 绘制）：夜战中 6 个敌人时平均 0.36 ms、p95 0.90 ms；第 9 波 21 个敌人时平均 0.33 ms、p95 0.70 ms。上一轮为 0.30 / 0.80 ms。

同一场景在改动前（`main`）与本轮的单帧渲染时间，960×600，SwiftShader，每帧读回像素确保渲染完成，取中间 6 帧的平均值：

| 画质 | 场景 | 改动前 | 本轮 |
| --- | --- | --- | --- |
| 高 | 风暴战斗 | 1935 ms | 1959 ms |
| 高 | 夜战 | 2104 ms | 2224 ms |
| 中 | 风暴战斗 | 1243 ms | 1295 ms |
| 中 | 夜战 | 1423 ms | 1477 ms |
| 低 | 风暴战斗 | 1226 ms | 958 ms |
| 低 | 夜战 | 1102 ms | 1165 ms |

低画质关闭雨滴涟漪。其余新效果只在局部计算（岩层只在陡坡、积水只在潮湿的道路、火星只在焦痕内），所以三档画质都没有再单独裁减。

### 验证范围

同上一节：没有在真实 GPU 或手机上测量帧率，上表只说明新效果没有明显增加绘制成本。音效只检查了代码路径，没有试听。月光与日光路径只在转向太阳或月亮的镜头里可见，默认视角下主要看到的是近岸的灯光倒影。

### 补充：远景岛屿

合并后反馈：最高画质下第 3 波（暮色）里，把镜头压低时天边有一团黑影。按玩家实际看到的画面（界面浮层可见、战斗进行中）复现后确认，那是远景岛屿中的一座。原来的岛是用半球变形出来的，有三个问题：

- 整体是光滑的圆顶；
- 极点处的顶点按角度抬高不一，顶上裂开一道缝；
- 底部混在雾里，远看像一团悬在天上的黑色东西。

现在改为在平面网格上按噪声高度场生成低矮起伏的山脊，边缘落进水里，带浅色岸线，并单独加浓远景的大气雾化；小灯塔按岛屿自身的旋转放到高地上。在暮色、夜晚和夕阳逆光下用低角度复查，远岛都只是海平线上淡淡的山影。

另外读回了泛光处理前的半精度 HDR 缓冲（9 个机位 × 12 个光束角度），没有溢出或 NaN 像素，最亮约 870。由此排除了泛光把异常像素扩散成黑斑的可能。

## 2026-10-09 · 最高画质的黑色多边形

本次在 macOS 的 Codex 内置浏览器复现，WebGL 使用 ANGLE Metal / Apple M5。1920×866 的宽屏视口下，最高画质的灯塔光束会在 HDR 缓冲中留下 NaN，随后被 Bloom 模糊扩散成大块黑色多边形。这与上一节修复的远景岛屿形状是两个问题；之前的 SwiftShader 检查没有触发这次的 GPU 插值误差。

冻结同一画面后，原始缓冲有 120 个 NaN 颜色分量；隐藏灯塔的两束光后为 0。光束片元着色器的 `vAlong` 即使在顶点阶段限制为 0–1，栅格插值仍可能略微超过 1，使 `pow(1.-vAlong,2.2)` 的底数变成负数。现在只给该底数加非负限制，正常光束衰减和 Bloom 均保留。同一画面修复后的 NaN 为 0。

验证结果：

- `npm test`：37 项通过，包括静态目录与单文件版的构建检查。
- 浏览器 GPU 回归：运行本地开发服务后打开 `http://localhost:4173/tests/rendering.html`。7 个用例直接运行生产光束片元着色器，检查灯源、光束内部、边缘和略微越界的半精度 HDR 输出；内部必须仍然发光。修复版全部通过，换回旧公式后两个越界用例均因 NaN 失败。这组 GPU 检查独立于 Node 的 `npm test`。
- 最高画质共读回 60 个画面的场景 HDR、全部 Bloom 降采样和升采样缓冲：12° / 38° / 70° 视角下各 12 个光束方向，夜晚 / 风暴 / 黎明各 6 个方向，两个地面光束目标，以及 2 倍像素比下的 4 个方向（3840×1732）。NaN / Infinity 分量均为 0，控制台无错误或警告。

以上结果验证了当前设备上的渲染正确性，没有测量手机或其他 GPU 的帧率。

## 2026-10-09 · 引导气泡关闭

关闭按钮会记录当前引导已完成，但原先同时清空显示缓存，导致更新界面时误判为没有变化，气泡仍留在画面上。保留缓存后，更新会立即隐藏气泡并清除基座高亮。另将气泡移出世界菜单的堆叠层，单独放在 HUD 上方：开始一波的提示此前被底部电网扩容按钮挡住，点击 × 会误触扩容。

在 Codex 内置浏览器的独立本地测试来源中验证：

- 三维视图下，建造、开波、光束、夜战四种引导均通过实际点击 × 关闭，刷新后仍保持关闭。
- 开波引导的关闭按钮命中 `coach-close`，关闭前后资金为 115、电网容量为 12，没有误触电网扩容。
- 二维视图下，建造引导可用 Enter 关闭，刷新后保持关闭。控制台无错误或警告。
- `npm test`：37 项通过，包括静态目录与单文件版构建；`git diff --check` 通过。

后续光束和夜战提示通过仅在 `?debug` 下启用的游戏接口准备状态，再实际点击关闭按钮验证；没有重跑完整十波战斗。

## 2026-10-10 · 正式试玩域名更新

正式试玩地址更新为 <https://last-beacon.pjstack.dev>。上文的旧域名属于 2026-09-07 的发布记录。

在桌面 Chrome 中直接打开新地址，无需登录、下载或安装；三维海岛、资源面板与建造栏正常显示。点击「Begin the first wave」进入第一波战斗，随后正常进入第二波准备阶段。HTTP 检查返回 200。

本次验证覆盖新域名访问与首波运行，未重跑完整战役或多设备性能测试。

## 2026-11-06 · iOS / Android release implementation

Candidate: **Last Beacon / 最后的灯塔**, `ai.lumiora.lastbeacon`, marketing **1.0.0**, local build **1794024483**. Source baseline is `42e7693`; the candidate includes the mobile implementation recorded in `docs/MOBILE_RELEASE.md`. Native web bundle SHA-256: `68d147e41dab0936ad21adce44b8088646a765842491203ed0a314bf0c41fad1`.

### Automated and packaged-app evidence

- `npm test`: **48/48 pass**. Includes deterministic original/restored continuation, all projectile types, night/boss/endless snapshots, malformed/future save rejection, backup recovery, terminal markers, failed-write retry, settings migration, pause ownership, and repeated save restoration through a complete real-budget campaign.
- `npm run build`: static site and self-contained HTML build successfully, with 20 inlined modules. `npm run build:native` produces a separate release bundle without the game debug hook; browser distribution remains independent of Capacitor packages at runtime.
- `npm run test:mobile`: portrait/landscape, both locales, small phone/tablet bounds, real touch purchases, Continue, blocked/failed storage, hidden/modal pause ownership, WebGL restoration/fallback, release offline assets, diagnostics, idle checkpoint behavior, public policy/support links, dense pad picking, and boss HUD spacing. Results are recorded below.
- Android: Java 21, API 36 emulator (`emulator-5570`), debug APK containing release web assets. `:app:assembleDebug :app:bundleRelease` succeeds. `ANDROID_SERIAL=emulator-5570 npm run test:android` passes actual native touch building, hardware Back/menu/help/pause, Filesystem checkpoint inspection, force-stop/relaunch/Continue, persisted Preferences, and landscape bounds. The restored watch retains **115 parts**, the purchased defense, and the active wave paused. Report: `artifacts/android-smoke/report.json`; screenshots beside it.
- iOS: Xcode **26.3**, device SDK **iphoneos26.2**, iOS **26.3** simulator, iPhone 17 Pro. Unsigned Release archive succeeds. Separate XcodeGen/XCTest UI tests cover paid touch building, handbook during combat, both landscapes, Home/background pause, process termination/relaunch, and Continue with the purchased defense and **115 parts**. Results are recorded below. Tests use ordinary accessibility controls, including changing the persisted language through the menu.
- `npm run mobile:verify` passes: Android and iOS contain the exact current web bundle; iOS app ID/version/build/minimum **15.5** and iPhone-only device family are correct; the archive contains app-level UserDefaults **CA92.1** and FileTimestamp **C617.1** declarations. Store icons/feature graphic have correct sizes and no alpha. The AAB contains **zero bundled `.so` files**. Both release candidates are **unsigned**.

Local artifacts (ignored by Git):

| Artifact | Location / checksum |
| --- | --- |
| Android debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Android unsigned AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| AAB SHA-256 | `e5e0570d32628d09152d10f93c96fd194cb955772e79d5ff3c3d6c3f8a93a980` |
| iOS unsigned archive | `artifacts/LastBeacon-unsigned.xcarchive` |
| Packaging verification | `artifacts/mobile-verification.json` |
| Native iOS UI results | `artifacts/ios-ui/Logs/Test/` |
| Android native QA | `artifacts/android-smoke/` |

### Store materials and public pages

**24 opaque PNG gameplay screenshots** were captured from the packaged QA apps with this candidate's release web assets. Each device class has English and Simplified Chinese versions of connected building, night combat, and the Abyssal Colossus. Gameplay checkpoints come from a complete campaign using public `Game` actions and a finite budget; capture scripts do not grant resources or enable the release debug hook.

| Device class | Pixels | Images | Directory under `artifacts/store-screenshots/` |
| --- | --- | --- | --- |
| iPhone 17 Pro | 1206×2622 | 6 | `ios/iphone-medium/` |
| iPhone 17 Pro Max | 1320×2868 | 6 | `ios/iphone-large/` |
| Android phone | 1080×1920 | 6 | `android/phone/` |
| Android tablet | 1600×2560 | 6 | `android/tablet/` |

`artifacts/store-screenshots/candidate.json` records build, native web hash, dimensions, locale, scene, and each PNG's checksum. Per-class manifests and iOS `.xcresult` capture attachments are retained. Screenshot inspection exposed boss health overlapping the resource HUD and dark status icons against night scenes; both were fixed before this final capture set. Capture commands are in the README. Native iPad remains outside v1 scope.

[Privacy](https://lumioragame.github.io/last-beacon/privacy.html) and [support](https://lumioragame.github.io/last-beacon/support.html) are published from the separate `mobile-policy-pages` branch. [Deployment 42335045481](https://github.com/LumioraGame/last-beacon/actions/runs/42335045481) succeeded; both pages return HTTP 200 and match the local `legal/` sources byte-for-byte. The current fork's [issue tracker](https://github.com/LumioraGame/last-beacon/issues) is enabled as the support contact. Publication evidence is in `artifacts/policy-publication/`. Localized listing copy is in `docs/store/LISTINGS.md`.

### Remaining release gates

These checks establish simulator/emulator behavior, not physical-device performance or store approval. Minimum deployment targets are configured, but execution here uses current iOS 26.3 and Android API 36, not iOS 15.5 / Android API 24 hardware. Still required: physical cutouts/navigation variants, long press and camera gestures, accessibility enlargement, minimum-device FPS/memory/heat/battery, extended endless play, upgrade migration on physical devices, silent switch/calls/Siri/headphones, signed candidates, publisher legal/privacy/rating/territory declarations, and TestFlight/Play beta feedback.

The existing logged-in Play Console identifies **Lumiora Labs Inc.** as an **Organization account**; the new-personal-account closed-test rule is not assumed to apply. App Store Connect is accessible, but no Last Beacon app record has been created. Local Keychain inspection finds an Apple Development identity and no Apple Distribution identity. The publisher's exact Apple Team and app-specific Android upload-key custody remain pending. No app registration, binary upload, store declaration, submission, or app release was performed. The review branch is `mobile/release-readiness`, with [draft PR #1](https://github.com/LumioraGame/last-beacon/pull/1). Hosted CI on `3a08405` passed all three jobs: [game/browser, Android compilation/artifact inspection, and iOS compilation/artifact inspection](https://github.com/LumioraGame/last-beacon/actions/runs/42336916808). The first run exposed an obsolete Android SDK setup default; both normal and signing workflows now install explicit API 36 packages. Subsequent touch-hint refinement is validated by the PR checks and refreshed local candidate evidence.

Final local regression for build **1794023636**: **48 Node tests passed, 22 Playwright tests passed, and 2 native iOS XCTest UI tests passed**, with zero failures. Android packaged-app smoke passed on the same build. All 24 screenshot dimensions and opaque PNG formats were verified after capture. Native release artifact inspection passed against the same web-bundle hash shown above.

Build **1794024483** refines the camera/strike hints and battlefield accessibility description for touch users. Its native archive and AAB pass the same artifact checks, and all 48 unit tests pass. Screenshot capture manifests now record the build and native web hash directly. Fresh-storage Android smoke with airplane mode enabled and Wi-Fi disabled also passed on the preceding build; the emulator network settings were restored afterward. Physical-device gates remain open.

## 2026-11-07 · Native file interruption coverage and development signing

- `npm test`: **50/50 pass**. The new finite-budget extended session completes the campaign on Easy, enters endless mode, and reaches wave **30**. **247 checkpoints** continue identically to an uninterrupted game across **1,573 simulated seconds**. The largest complete checkpoint envelope is **10,899 bytes**, below the configured **2,097,152** limit. A separate oversized-checkpoint case rejects the write without replacing the previous valid watch. This is simulation/save evidence; it does not establish physical-device FPS or thermal behavior.
- `npm run test:native-storage`: **11/11 pass**. esbuild bundles the actual `src/platform/native.js`, replacing only Capacitor bridge calls with a file-system fault harness. Tests interrupt all six operations of candidate-write/verify/delete/promote/read-back, preserve the prior committed slot, retry from a fresh store, reject partial writes, recover a damaged promotion, and interrupt duplication of committed terminal/discard markers. Permission, full-storage, and non-absence native errors propagate. This suite runs after `npm ci` in readiness and signing CI; zero-install rule tests remain separate.
- The local certificate subject identifies **Lumiora Labs Inc.**, Team **N2U5V543PB**. `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath artifacts/ios-development DEVELOPMENT_TEAM=N2U5V543PB CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates build` succeeds with the existing development identity/profile. `codesign --verify --strict` passes; entitlements identify `N2U5V543PB.ai.lumiora.lastbeacon` with development debugging allowed. Build **1794024483** contains the same release web bundle SHA-256 as the unsigned candidate above. Evidence: `artifacts/ios-development/verification.json`. This is **Apple Development** signing, not distribution signing or TestFlight eligibility.
- Authoritative device discovery finds a paired 9th-generation iPad over the local network, but it requires a passcode and Xcode cannot mount its developer image. No native QA result is claimed for it. The paired iPhone 13 is unavailable and no Android phone is attached. The user has been asked to unlock/provide devices; no passcode was requested. Native iPad product support remains deferred, and compatibility testing on an iPad would not replace the physical iPhone/Android release gates.
- The preceding final candidate also passed fresh-storage Android smoke with airplane mode on and Wi-Fi off, all **22 browser checks**, and both native iOS UI checks on build **1794024483**. Hosted [CI for source 5eadfd1](https://github.com/LumioraGame/last-beacon/actions/runs/42337193518) passes all three jobs. This resolves the earlier evidence wording that referred only to the preceding build. Current follow-up changes add tests, signing-team configuration and documentation; the game bundle and 24 current screenshot hashes are unchanged.

## 2026-11-07 · Distribution-signed candidates and Apple draft listing

Xcode's existing Lumiora account resolved distribution signing without exporting an Apple private key. Automatic provisioning registered the explicit Bundle ID, archived successfully, and exported an IPA using `method=app-store-connect`, `signingStyle=automatic`, Team `N2U5V543PB`, and `manageAppVersionAndBuildNumber=false`. The exported signature verifies as **Apple Distribution: Lumiora Labs Inc**, with `get-task-allow=false` and beta reports enabled. A local Apple Distribution identity is not required when this Xcode-managed workflow succeeds.

Android now uses a separate app-specific **4096-bit RSA / SHA256withRSA** upload key, valid through 2054. Its encrypted PKCS12 file is outside the repository at `~/Library/Application Support/Lumiora/Signing/ai.lumiora.lastbeacon/upload.p12` (file permissions 600, containing directory 700). The password is stored in the current user's macOS Keychain, service **ai.lumiora.lastbeacon.android-upload**, account **last-beacon-upload**. `scripts/sign-android-local.swift` retrieves it without printing it, rebuilds release web assets, synchronizes Android, signs through Gradle and verifies the resulting JAR signature. No private signing materials were committed or copied into GitHub secrets. Publisher backup/recovery ownership remains part of release handoff.

Public Android upload-certificate SHA-256: **F7:8C:B3:CE:62:A6:AB:47:61:56:CD:53:C1:D9:41:40:99:27:24:50:70:6D:5E:95:57:9E:6F:78:8A:80:53:72**. The signed bundle's certificate matches the exported public certificate. Jarsigner verifies the bundle; its self-signed-certificate trust warning is expected for this upload key. Official Google bundletool **1.18.3**, verified against release SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`, validates the bundle and reads the actual packaged manifest: `ai.lumiora.lastbeacon`, version **1.0.0 (1794024483)**, minimum API **24**, target/compile API **36**, and debugging disabled.

Final packaging adds the full game/Three.js notices, pinned Capacitor/plugin MIT notices, Ionic filesystem SDK notices, and Apache 2.0/runtime dependency notices. The static build also includes the game license, and the standalone HTML embeds game/Three.js notices. Runtime inventory was checked against Gradle's resolved release components. The verifier now compares **all 20 bundled web assets**, including CSS, HTML, policy pages and license notices, instead of checking only the game JavaScript. Both the unsigned archive and the final signed IPA/AAB pass that expanded check. Game code/UI assets did not change; the 24 build-1794024483 gameplay captures still match.

| Final signed artifact | SHA-256 |
| --- | --- |
| `artifacts/ios-distribution/export/App.ipa` | `171b83576c5a9a864ddd54df45203d7a66d2777b6ce79ab6423787fb293f83c1` |
| `android/app/build/outputs/bundle/release/app-release.aab` | `cbfafb74373d0f00d03bb7b190e5a41cbde1184df24fec5979a48b35e1d601ff` |
| Complete bundled web asset set | `3b92957c18f358477b2606b4740af03d914b8652dc38b4926f6f4dd432f3bdd7` |

Current detailed proof is in `artifacts/ios-distribution/verification.json`, `artifacts/android-signing/verification.json`, and `artifacts/mobile-verification.json`. Earlier hashes in this chronological record identify preceding candidates, not these final signed packages.

App Store Connect confirmed the existing provider as **Lumiora Labs Inc.** The initial name **Last Beacon** was rejected as already used; **Last Beacon: Island Defense** was accepted. Apple app **6831920904**, Bundle ID **ai.lumiora.lastbeacon**, SKU **ai.lumiora.lastbeacon.ios**, primary language **en-US**, and iOS version **1.0.0** now exist in **Prepare for Submission**. English and Simplified Chinese descriptions, keywords, support URLs and promotional text are saved; English/Chinese names and subtitles and Games/Strategy category are prepared. English version metadata was refreshed and read back, including no sign-in requirement and manual release. Review notes explain the offline game and Continue flow. Apple's creation flow reported an access-settings save warning, with effective all-user access; Full Access had been selected, and no team member roles were changed. Store evidence is retained in `artifacts/store-console/`.

No review submission or app release has occurred. Screenshot association, remaining privacy/rating/territory/contact inputs, beta processing/feedback and physical-device gates remain open. Current [Apple submission requirements](https://developer.apple.com/news/upcoming-requirements/) were rechecked before upload preparation: the signed candidate uses Xcode 26.3/iOS 26.2 SDK and deployment minimum 15.5. New-account personal Play testing restrictions are not assumed for the verified organization account.

## 2026-11-07 · Apple upload and internal beta preparation

Packaging source **871af0a** passes all three hosted [readiness CI jobs](https://github.com/LumioraGame/last-beacon/actions/runs/42357128849), including the 50 rule/storage tests, 11 native bridge interruption tests, 22 browser tests and native asset verification. The final signed artifact hashes in the preceding table reflect the normalized notice file in that source.

`xcodebuild -exportArchive` with `destination=upload` and the existing Xcode account completed successfully. App Store Connect processed **1.0.0 (1794024483)**, then reported Ready to Test for internal testing. The **Last Beacon QA** internal group contains that exact build with automatic distribution disabled, **0 testers** and no invitations sent. Version 1.0.0 is associated with the same processed build. This is beta preparation, not a review submission or public release. The listed IPA checksum identifies the local export; Xcode re-signs its archive for upload and Apple may transform processed binaries.

App Information was refreshed and both names/subtitles and Games/Strategy category read back successfully. Both localized privacy URLs are saved. The audited **Data Not Collected** answer is saved as a draft; Apple's final privacy Publish confirmation includes accuracy, legal-compliance and future-update certifications. The publisher has been asked to authorize that exact attestation; the confirmation was cancelled while keeping the draft. Reviewer contact details and intended tester recipients have also been requested.

The live Media Manager identifies **iPhone with Dynamic Island (medium display)** as Required, accepting **1206×2622**; its large-display and other device slots are Optional. **Three English and three Simplified Chinese gameplay images** are uploaded and associated separately in that required slot, in connected-defense/night-watch/boss order. Each locale reads **3 of 10 App Screenshots**, all three preview images load with nonzero natural dimensions, and no alert is shown. The night image initially had a cloud placeholder; it subsequently loaded without another upload. Visual evidence is `artifacts/store-console/16-zh-required-screenshots-ready.png` and `17-en-required-screenshots-ready.png`. Optional large-display captures remain prepared locally; native iPad is not supported by this candidate.

The verified organization Play account's live Create app form is prepared with **Last Beacon: Island Defense**, **ai.lumiora.lastbeacon**, **English (United States)**, **Game** and **Free**. Check availability reports **Package name available**. Creation requires Developer Program Policies and US export-law certifications; both remain unchecked, and the publisher has been asked to authorize those exact certifications. No Play app record or upload exists yet. This is a form preparation result, not a saved draft. Evidence: `artifacts/store-console/19-play-create-awaiting-certifications.png`. Automatic protection is turned off in the prepared form to retain the offline distribution model; Google's [automatic-protection documentation](https://support.google.com/googleplay/android-developer/answer/10183279) explains that installer checks can periodically require a connection after prolonged Play Store inactivity. Recheck the saved setting after app creation and actual Play-generated APK behavior during beta.

Apple **free pricing** is saved. After reopening Pricing, the current-price dialog shows **175 price rows**, all zero. Availability is separately saved for **174 countries/regions**: China mainland reads **Not Available**, while the selected territories read Available on App Release. Automatic inclusion in future territories is off. Mac and Vision Pro distribution are both unchecked after reopening Pricing, matching the v1 iPhone scope. No pre-order or public release was started. Evidence: `artifacts/store-console/20-china-excluded.png` and `21-free-prices-verified.png`.

App Information still offers **Set Up Content Rights Information**, **Set Up Age Ratings**, and a **Vietnam Game License** section. These remain publisher/store completion items; the draft territory configuration alone does not establish eligibility in every selected market. No trader, tax, banking or account-membership settings were changed. A final device discovery still finds the iPhone unavailable and no Android device attached, so the physical-phone gates remain open.

## 2026-11-07 · Native in-place app-update checks

Both platforms now have repeatable QA that updates **1.0.0 (1794024483)** to a higher **QA-only build 1794024484**, retaining the same game assets. This does not change the source project's build number, distribution candidates or uploaded Apple build.

- **Android 16 / API 36 emulator**, WebView **156.0.8078.47**: the extended `scripts/android-smoke.mjs` buys a defense, starts and pauses a wave, waits for its actual committed checkpoint, force-stops, and installs a higher-build debug APK using `adb install -r`. Preferences and both committed checkpoint files compare byte-for-byte before/after installation. Continue restores the paused wave with **115 parts**, then Back/help/landscape checks pass. The ordinary no-update path also passes. The upgrade APK preflight rejects a non-increasing build before game interaction. Reports: `artifacts/android-upgrade/smoke/report.json` and `no-update/report.json`; both APKs match all **20 current native web assets** plus the generated Capacitor bridge placeholders.
- **iPhone 17 Pro / iOS 26.3 simulator**: `npm run test:ios-upgrade` runs the existing touch/lifecycle/rotation test to create a saved paid-defense wave, builds and installs the higher-build app, then compares native Preferences and both save files unchanged. The separate **UpgradeCheck** XCTest passes Continue, paused-wave, **115 parts** and **Pad 02 / Sentinel** checks. Baseline and post-update result bundles, screenshot attachment, hashes and runtime metadata are in `artifacts/ios-upgrade/`. All **20 assets** match the candidate; the full asset-set hash remains `3b92957c18f358477b2606b4740af03d914b8652dc38b4926f6f4dd432f3bdd7`. Existing evidence directories are rejected before any build or game interaction.

The Android work exposed a QA race: the fixed 1.2-second sleep could read the prior build-phase save before the wave checkpoint committed. The smoke check now waits for the committed wave, paid defense and correct credits. An initial newly booted software-rendered emulator attempt timed out choosing New watch; subsequent warmed startup and complete checks passed. Physical cold-start/performance acceptance remains open.

Android remote-debugger screenshots omitted the canvas and distorted parts of the UI on this emulator. A native `screencap` taken alongside the remote capture shows the rendered 2D island and defenses; canvas readback also contains terrain colors. The smoke helper now captures the actual device screen, as the store-capture helper already does. Comparison images are `artifacts/android-upgrade/visual-native.png` and `visual-cdp.png`; the old remote images are not visual proof of a blank game.

These are simulator/emulator debug-shell update checks with release game assets. They do not establish physical minimum-device performance, audio behavior, or TestFlight/Google Play generated-package update behavior. The signed IPA/AAB checksums remain unchanged and expanded artifact verification still passes.

## 2026-11-07 · Touch coaching fix and candidate 1794024485

Native visual inspection found a remaining onboarding instruction telling phone users to press **B**. Touch/native beam coaching now points to the visible Beam button; its hint says Tap rather than Click, and beam/log accessibility labels omit keyboard suffixes. Both English/Chinese native-bundle regressions activate the actual Beam button; a desktop regression retains keyboard guidance. No gameplay, save schema, dependencies or permissions changed.

Candidate **1.0.0 (1794024485)**, source **8d98a4d**, passes **50 Node tests, 11 native-storage fault tests and 25 browser checks**. All three [hosted readiness jobs](https://github.com/LumioraGame/last-beacon/actions/runs/42363285603) pass. Android native smoke upgrades the installed QA build **4484 → 4485**, verifying unchanged Preferences/checkpoints and paused Continue with 115 parts, Back/help and landscape bounds (`artifacts/android-upgrade-1794024485/`). iOS now runs **both** original MobileSmoke tests before updating **4485 → QA-only 4486**, followed by the separate UpgradeCheck test; all three pass (`artifacts/ios-upgrade-1794024485/`). The source native version and store candidate remain 4485.

Both candidates are signed with the established identities. Strict/deep iOS signature verification passes; the exported app is `N2U5V543PB.ai.lumiora.lastbeacon`, debugging disabled, beta reports enabled. Android signature verification and bundletool validation pass, the upload certificate matches its pinned fingerprint, and the packaged manifest is build 4485 / target API 36 / debugging disabled. All **20 web assets** match, with zero Android `.so` files.

| Current signed artifact | SHA-256 |
| --- | --- |
| `artifacts/ios-distribution-1794024485/export/App.ipa` | `5ecd165c134e88b229f754e316d62d789b36e16e71a180f9d5b79f4cb0710c9a` |
| `android/app/build/outputs/bundle/release/app-release.aab` | `ab85315e01448549e62184b6962deffcaf82bc6e892757d781256d766114cbb7` |
| Game JavaScript | `0ac287fde56bbff93607550d652c8966738ceca230ffef13f4fb2bba1293cba2` |
| All bundled web assets | `4b3d11a4c3da424ebae7b8d13b496eb22cfa521fd24ab1f26b2605016502b8fe` |

Xcode successfully uploaded **4485** and reported **Uploaded package is processing**. The browser then redirected to App Store Connect sign-in, so Ready to Test status, current-version build association and current screenshot association are not yet verified. The user has been asked to restore sign-in in the existing Chrome profile. Before that redirect, the existing **Last Beacon QA** group showed **1 internal tester / Invited / no sessions**, added externally; this agent did not send an invitation. The previous 4483 build remains the last verified version/group association.

The prior signed AAB/report are retained in `artifacts/release-1.0.0-1794024483/`; its IPA remains in the earlier distribution directory. **All 24 screenshots were recaptured from build 1794024485** and checked for dimensions, opaque PNG format and matching native web hash. English/zh-Hans each include connected-defense, night-watch and boss scenes at iPhone 1206×2622 / 1320×2868 and Android 1080×1920 / 1600×2560. Current iOS folders have the `-1794024485` suffix; `artifacts/store-screenshots/candidate.json` records every image hash and source 8d98a4d, and `index.html` is the review gallery. Capture sessions completed and the dedicated simulators/emulator were shut down afterward. These current captures are prepared locally; the previously associated Apple screenshots remain the last verified console state.

Publisher declarations, review contact, physical-device acceptance and store beta feedback remain open; no review submission or public release occurred.
