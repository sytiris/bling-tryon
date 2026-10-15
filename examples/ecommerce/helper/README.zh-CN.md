[English](README.md) | **简体中文**

# 试衣镜bling

用你自己的 Decart API Key，在购物网页上实时试衣。当前为可试用版本：本机已验证 macOS Apple Silicon；Intel Mac/X64、Windows/X64、Linux/X64 提供自动构建包，摄像头与购物网站兼容性仍需对应设备验证。

界面默认跟随浏览器语言，点击语言按钮可切换并记住选择；插件与助手各自保存语言偏好。Chrome 扩展列表名称跟随 Chrome 本身的语言。

Mac 安装包要求 macOS 13.5 或以上。Intel / `x86_64` 下载 `bling-tryon-macOS-X64.tar.gz`；Apple Silicon / `arm64` 下载 `bling-tryon-macOS-ARM64.tar.gz`。请检查实际最新 Release，Intel 电脑不要使用 ARM64 运行时。

## 第一次使用

1. 将**整个安装包**解压到固定文件夹。
2. macOS 双击 `start-macos.command`；Windows 使用 `start-windows.cmd`（也保留中文名称启动器），Linux 运行 `start-linux.sh`。选择与你系统/芯片匹配的安装包，内含 Node 运行时，无需安装开发环境。
3. 浏览器会打开 `http://127.0.0.1:3000/setup`。未配置 Key 时还会自动打开 [Decart API Keys](https://platform.decart.ai/api-keys)，请先注册/登录、查看试用积分并创建 Key，再在本机页面点击「验证并保存」。验证只申请短期令牌，不启动实时生成。签发令牌成功不等于账户余额足够试穿。
4. Chrome 打开 `chrome://extensions`，开启开发者模式，点击「加载未打包的扩展程序」，选择包内 **chrome-tryon** 文件夹。助手页面可以复制文件夹路径。
5. 回到 HTTPS 购物页，点插件图标。悬浮衣服图片，点「试试这件」；允许相机后，主动点 **10 秒 / 20 秒**。

保持助手终端开启。关闭助手配置网页不会停止服务；终端按 Ctrl+C 退出。再次双击启动器会复用已运行的助手。3000 端口被旧版 Next 开发服务占用时，需要先关闭旧服务。

下载文件被 macOS 或 Windows 拦截时，请先核对来源与校验和，按系统提供的受信任文件打开流程操作。本项目尚未提供系统签名/公证安装器，不是 Chrome 商店的一键安装版本。

## 注册 Decart 与试用积分

先在 [Decart API 控制台](https://platform.decart.ai/)自行注册/登录并完成验证，然后在账户中查看试用额度。[官方说明](https://docs.platform.decart.ai/getting-started/pricing#faq)目前写明新账户有免费试用额度，具体金额、有效期和使用条件以控制台为准；本项目不提供积分，也不自动充值。Decart API 按量计费，无需购买订阅会员。

在 [API Keys 页面](https://platform.decart.ai/api-keys)创建并复制 Key，回到本机助手粘贴到密码框，点击「验证并保存」。密钥只填在自己的本机页面，不要发给聊天或智能体。需要更换时在同一页面保存新 Key，删除本机配置不会撤销平台上的 Key。

也可以让能操作本机的智能体按包内 AGENTS.md 完成下载、启动和打开网页；注册、条款确认、密钥填写、充值和浏览器权限仍由你自己完成。已配置 Key 后，再启动不会重复打开 Decart；刷新设置页也不会打开外站。浏览器没有自动弹出时，手动打开上述两个页面即可。

## 密钥与费用

每位用户使用自己的 Decart 账户并承担其生成费用。永久 Key 保存在用户本机配置目录的 `user.env` 文件中，运行时交给本地服务；插件只拿短期令牌。不会同步到 Chrome 账户，也不会发给插件作者。Unix/macOS 的新配置目录权限为700、文件为600；配置文件并非加密保险库，能读取该用户文件的本机进程仍可能读取密钥。

- macOS：`~/Library/Application Support/试衣镜bling/user.env`
- Windows：`%LOCALAPPDATA%/BlingTryOn/user.env`
- Linux：`~/.config/bling-tryon/user.env`（支持 `XDG_CONFIG_HOME`）

设置页可测试、更换或删除密钥。验证失败不覆盖旧值；删除后助手不会在下次启动时恢复旧的环境变量密钥。删除本机配置不会撤销 Decart 平台上的 Key；需要撤销时请到 Decart 控制台操作。

10 / 20 秒指**出画后的体验时长**。实时模型按实际生成时长收费，出画前生成的时间也可能计费。两档都用 `lucy-vton-latest` 标准模式，未开启费用翻倍的 fast 模式。正方形裁剪只改变取景，不降低每秒费用。请以 [Decart 官方价格](https://docs.platform.decart.ai/getting-started/pricing)为准。

## 停止规则

- 选衣、相机本地预览和打开设置不会开始实时生成。
- 出画后10/20秒断开AI，保留最后一帧和本地相机；再次生成必须主动点击。
- 关闭相机、收起/关闭浮窗、隐藏/刷新购物页会停止生成；相应操作会关闭本地相机。
- API错误、离线、相机/远端轨道中断会结束当前会话，无自动重试。
- 插件在试穿时检测助手；助手退出或密钥变更时尽快停止当前生成。
- 连接与首帧上限30秒，前端及 Decart 服务端会话上限45/55秒。崩溃、系统休眠或严重断网时无法承诺瞬间断开，服务端上限用于兜底。

## 已知限制

网页图片采用尺寸和结构筛选。CSS背景图、跨域iframe、封闭组件、防盗链和登录图片可能无法读取。部分网站明确禁止浮窗使用摄像头，插件会显示提示。Chrome内部页面/扩展商店不支持注入。真实上身效果取决于站位、光线、参考图和模型；请把要试穿的部位置于中心正方形内。

需要HTTP代理时，启动前设置 `TRYON_PROXY_URL`（例如你自己正在使用的本机HTTP代理地址），或继承已有 `HTTP_PROXY`/`HTTPS_PROXY`。助手不改变系统代理设置。不要使用来源不明的代理处理你的密钥与相机请求。

## 来源与支持

基于 [DecartAI/tryon-examples](https://github.com/DecartAI/tryon-examples) 和 Decart JavaScript SDK 修改，保留 MIT 许可及第三方声明。本工具与 Decart 官方无隶属关系。

出现问题时可以提供操作步骤、系统/Chrome版本和已脱敏的错误提示。不要在Issue、截图、日志或聊天中粘贴API Key、短期Token或摄像头画面。
