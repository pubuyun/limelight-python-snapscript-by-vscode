# Limelight Python Snapscript VSCode 插件

这是一个用于与 Limelight 服务器交互的 VSCode 插件，支持 Python 代码实时预览和上传功能。

## 功能特性

- 实时预览 Limelight 视频流（端口 5800）
- Python 代码一键上传到 Limelight 服务器
- 支持保存时自动上传代码
- 可配置 Limelight 服务器地址

## 使用方法

1. 打开命令面板（Ctrl+Shift+P）
2. 输入以下命令：
   - `Limelight: Open Preview` - 打开视频预览窗口
   - `Limelight: Upload Python Code` - 上传当前 Python 文件到 Limelight

## 插件配置

在 VSCode 设置中可以配置以下选项：

- `limelight.serverAddress`: Limelight 服务器地址（默认：http://172.28.0.1）
- `limelight.autoUpdate`: 是否在保存 Python 文件时自动上传（默认：false）

## 使用提示

1. 确保 Limelight 服务器已经启动并且可以访问
2. 视频预览窗口可以通过拖拽移动到任意位置
3. 代码上传成功后会显示提示消息
4. 如果开启自动上传，每次保存 Python 文件时都会自动上传到 Limelight 服务器
