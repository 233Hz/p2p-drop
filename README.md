# P2P Drop 🚀

> 免安装、免注册、即开即用的浏览器端跨设备 WebRTC 直连文件快传工具（AirDrop / Snapdrop 升级版）。

[![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-DataChannel-orange.svg)](https://webrtc.org/)
[![Supabase Realtime](https://img.shields.io/badge/Supabase-Realtime%20Signaling-3ECF8E.svg)](https://supabase.com/)

---

## ✨ 核心特性

- 🌐 **零服务器带宽成本**：文件经 WebRTC `RTCDataChannel` 纯端到端加密直连传输，数据不经过任何第三方服务器中转。
- 📡 **自动发现与私密房间**：
  - **同网雷达发现**：自动获取当前出口 IP 散列加入广播大厅，同一 Wi-Fi 或局域网下的设备打开网页即刻现身。
  - **私密房间 / 扫码互联**：支持生成 6 位房间码或带 Hash 的直达链接，手机扫描二维码即刻跨网配对。
- 🛡️ **双向授权与安全防护**：发送端发起传输前，接收端弹出文件列表与尺寸核对浮窗，用户点击“同意”后才开始打洞传输。
- ⚡ **高性能双通道与背压流控**：
  - `control` 通道（JSON）同步文件元数据、取消、进度校验。
  - `data` 通道（Binary）按 32KB 分片传输，监听 `bufferedAmount` 与 `bufferedamountlow` 背压控制，防高带宽内存崩溃。
- 💾 **渐进式超大文件落地引擎**：
  - **桌面 Chromium**：优先接入 **File System Access API** (`window.showSaveFilePicker`)，边收边流式写入磁盘，支持超大文件（>1GB）近零内存占用。
  - **Safari / iOS / Firefox 降级**：大文件自动分块缓冲至 **IndexedDB** 后导出，普通小文件 (<200MB) 极速内存下载。
- 📱 **PWA 与剪贴板互传扩展**：
  - 支持手机添加至主屏幕（PWA），集成 **Web Share Target** API。
  - 支持文字、代码片段与剪贴板极速互传，一键复制。
  - Web Audio API 提示音合成与触觉振动反馈。
- 🧭 **NAT 穿透与诊断**：
  - 内置 Google / Cloudflare 多节点公共 STUN。
  - 设置面板支持自定义 TURN 服务器（支持企业高防与对称 NAT 穿透）。

---

## 🛠️ 技术栈架构

```
p2p-drop/
├── src/
│   ├── types/               # TypeScript 类型定义 (Peer, Transfer, Config)
│   ├── services/
│   │   ├── supabase.ts      # Supabase Realtime 信令中介 (Presence + Broadcast)
│   │   ├── ip.ts            # 公网出口 IP 获取与局域散列算法
│   │   ├── webrtc.ts        # WebRTC 连接与 SDP/ICE 协商管理
│   │   ├── channel.ts       # 双通道流控引擎与 32KB 分片传输
│   │   └── storage.ts       # FSA / IndexedDB / Memory 渐进落盘适配器
│   ├── composables/
│   │   ├── usePeerManager.ts# 设备发现、在线状态与昵称管理
│   │   ├── useTransfer.ts   # 传输队列调度、速率计算与 ETA 驱动
│   │   └── useConfig.ts     # 系统设置与深浅主题持久化
│   ├── components/
│   │   ├── HeaderBar.vue    # 顶部导航、状态信标与功能入口
│   │   ├── RadarCanvas.vue  # 雷达波纹动画背景与对端动态布局
│   │   ├── PeerNode.vue     # 设备节点（拖拽上传、系统图标、设备昵称）
│   │   ├── DynamicIsland.vue# 悬浮灵动岛实时进度与速率指示器
│   │   ├── TransferModal.vue# 授权接收确认弹窗
│   │   ├── TextModal.vue    # 剪贴板与文本快传弹窗
│   │   ├── QrCodeModal.vue  # 二维码与房间切换弹窗
│   │   └── SettingsModal.vue# Supabase 凭据与 TURN 服务器配置
│   ├── utils/
│   │   ├── names.ts         # 设备检测与随机萌系昵称生成
│   │   ├── format.ts        # 字节、速率与耗时格式化
│   │   └── sound.ts         # Web Audio API 提示音合成
│   ├── App.vue              # 应用主装配组件
│   └── main.ts              # 应用入口
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Supabase 信令凭据

项目采用 **Supabase Realtime** 作为轻量信令服务器（仅用于 Presence 发现与 SDP/ICE 交换，不产生任何文件数据流量，完全处于 Supabase 免费额度内）。

**获取凭据：**
1. 访问 [Supabase 官网](https://supabase.com) 免费注册并新建一个项目。
2. 在项目设置 `Settings` -> `API` 中复制：
   - **Project URL**
   - **anon / public key**

**配置方式（二选一）：**
- **方式 A（本地/部署环境变量）**：复制 `.env.example` 为 `.env.local` 并填入：
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
  ```
- **方式 B（页面即时配置）**：直接启动应用，在未配置提示条或右上角 ⚙️ **设置** 弹窗中填入 URL 与 Key，凭据将保存在本地浏览器的 `localStorage` 中。

### 3. 本地启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

### 4. 生产构建打包

```bash
npm run build
```

打包产物位于 `dist/` 目录，可直接部署至任何静态托管平台（如 Vercel、Cloudflare Pages、GitHub Pages 等）。

---

## 💡 使用指南

1. **同网络互传**：
   - 电脑与手机连接同一 Wi-Fi。
   - 分别在两端浏览器打开 P2P Drop。
   - 中央雷达将自动探测到对方设备。
   - 点击对方设备头像或将文件拖入头像中，接收端点击“同意接收”即可秒传。
2. **异地跨网互传**：
   - 电脑端点击右上角 **二维码** 图标，手机扫码即可直接加入同一私密房间。
   - 或在房间输入框中输入相同的自定义房间号（如 `888666`）。
3. **文本与链接快传**：
   - 点击右上角或设备卡片上的 **文本图标**，输入或一键粘贴剪贴板文字即可秒发至对端，对端支持一键复制。

---

## 📄 许可协议

MIT License
