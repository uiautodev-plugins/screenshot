# 截图管理插件

[uiauto.dev](https://github.com/nicepkg/uiautodev) 截图管理插件。支持截图查看、下载和删除。

## 安装

```bash
git clone https://github.com/uiautodev-plugins/screenshot.git ~/.uiautodev/plugins/screenshot
cd ~/.uiautodev/plugins/screenshot
npm install
```

## 开发

```bash
npm run dev          # 开发模式，监听 app.tsx 变化自动编译
npm run build        # 编译为 app.js
npm run fetch-types  # 拉取最新类型定义（需 uiauto.dev 运行中）
```

## 技术栈

- **Preact** + **TypeScript** + **Tailwind CSS**
- **esbuild** 编译打包
