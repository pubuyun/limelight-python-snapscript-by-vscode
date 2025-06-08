import * as vscode from "vscode";
import axios from "axios";

class LimelightPanel {
  public static currentPanel: LimelightPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "updatePythonInputs":
            await this._updatePythonInputs(message.inputs);
            break;
          case "refreshUI":
            this._update();
            break;
        }
      },
      null,
      this._disposables
    );

    this._update();
    this._startResultsPolling();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (LimelightPanel.currentPanel) {
      LimelightPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "limelightPreview",
      "Limelight Preview",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    LimelightPanel.currentPanel = new LimelightPanel(panel, extensionUri);
  }

  private async _fetchResults(serverAddress: string) {
    try {
      const response = await axios.get(`${serverAddress}:5807/results`);
      return response.data;
    } catch (error) {
      console.error("获取结果失败:", error);
      return null;
    }
  }

  private async _updatePythonInputs(inputs: number[]) {
    const config = vscode.workspace.getConfiguration("limelight");
    const serverAddress =
      config.get<string>("serverAddress") || "http://172.28.0.1";
    try {
      await axios.post(`${serverAddress}:5807/update-pythoninputs`, inputs, {
        headers: { "Content-Type": "application/json" },
      });
      vscode.window.showInformationMessage("Python输入已更新");
    } catch (error) {
      vscode.window.showErrorMessage(`更新Python输入失败: ${error}`);
    }
  }

  private _startResultsPolling() {
    const config = vscode.workspace.getConfiguration("limelight");
    const serverAddress =
      config.get<string>("serverAddress") || "http://172.28.0.1";

    const pollInterval = setInterval(async () => {
      if (this._panel.visible) {
        const results = await this._fetchResults(serverAddress);
        if (results) {
          this._panel.webview.postMessage({
            type: "updateResults",
            data: results,
          });
        }
      }
    }, 1000);

    this._disposables.push(
      new vscode.Disposable(() => clearInterval(pollInterval))
    );
  }

  private _update() {
    const config = vscode.workspace.getConfiguration("limelight");
    const serverAddress = config.get<string>("serverAddress");

    this._panel.webview.html = this._getHtmlForWebview(
      serverAddress || "http://172.28.0.1"
    );
  }

  private _getHtmlForWebview(serverAddress: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Limelight Preview</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            width: 100vw; 
            height: 100vh; 
            display: flex; 
          }
          .main-container { 
            display: flex; 
            width: 100%; 
            height: 100%; 
          }
          .video-container { 
            flex: 1; 
            position: relative; 
          }
          img { 
            width: 100%; 
            height: 100%; 
            object-fit: contain; 
          }
          .sidebar { 
            width: 300px; 
            background: #1e1e1e; 
            color: #fff; 
            display: flex;
            flex-direction: column;
          }
          .sidebar-top {
            flex: none;
            padding: 10px;
            border-bottom: 1px solid #333;
          }
          .sidebar-bottom {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .refresh-button {
            background: #2d2d2d;
            color: #fff;
            border: 1px solid #3c3c3c;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 3px;
          }
          .refresh-button:hover {
            background: #3c3c3c;
          }
          .results-container pre { 
            margin: 0; 
            padding: 10px; 
            background: #252526; 
            font-family: monospace; 
            font-size: 12px; 
            white-space: pre-wrap; 
            word-wrap: break-word; 
          }
          .input-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 5px; 
            margin-bottom: 10px; 
          }
          .input-group { 
            display: flex; 
            flex-direction: column; 
          }
          .input-group label { 
            font-size: 12px; 
            margin-bottom: 2px; 
          }
          .input-group input { 
            width: 100%; 
            padding: 5px; 
            background: #3c3c3c; 
            color: #fff; 
            border: 1px solid #565656; 
          }
          .update-button { 
            background: #0e639c; 
            color: white; 
            border: none; 
            padding: 8px 12px; 
            cursor: pointer; 
            width: 100%; 
          }
          .update-button:hover { 
            background: #1177bb; 
          }
        </style>
      </head>
      <body>
        <div class="main-container">
          <div class="video-container">
            <img src="${serverAddress}:5800" alt="Limelight Stream" />
          </div>
          <div class="sidebar">
            <div class="sidebar-top">
              <div class="header-container">
                <h3 style="margin: 0;">Python输入</h3>
                <button class="refresh-button" onclick="refreshUI()">刷新</button>
              </div>
              <div class="input-grid">
                <div class="input-group">
                  <label>输入 1</label>
                  <input type="number" id="input0" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 2</label>
                  <input type="number" id="input1" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 3</label>
                  <input type="number" id="input2" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 4</label>
                  <input type="number" id="input3" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 5</label>
                  <input type="number" id="input4" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 6</label>
                  <input type="number" id="input5" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 7</label>
                  <input type="number" id="input6" value="0" />
                </div>
                <div class="input-group">
                  <label>输入 8</label>
                  <input type="number" id="input7" value="0" />
                </div>
              </div>
              <button class="update-button" onclick="updateInputs()">更新输入</button>
            </div>
            <div class="sidebar-bottom">
              <div class="header-container">
                <h3 style="margin: 0;">Python输出</h3>
              </div>
              <div class="results-container">
                <pre id="results">等待数据...</pre>
              </div>
            </div>
          </div>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'updateResults' && message.data && message.data.PythonOut) {
              document.getElementById('results').textContent = JSON.stringify(message.data.PythonOut, null, 2);
            }
          });

          function updateInputs() {
            const inputs = [];
            for (let i = 0; i < 8; i++) {
              const el = document.getElementById('input' + i);
              const val = Number(el.value);
              inputs.push(isNaN(val) ? 0 : val);
            }
            vscode.postMessage({
              command: 'updatePythonInputs',
              inputs: inputs
            });
          }

          function refreshUI() {
            vscode.postMessage({
              command: 'refreshUI'
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  public dispose() {
    LimelightPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

async function uploadCode(code: string) {
  const config = vscode.workspace.getConfiguration("limelight");
  const serverAddress =
    config.get<string>("serverAddress") || "http://172.28.0.1";

  try {
    await axios({
      method: "post",
      url: `${serverAddress}:5807/upload-python`,
      data: code,
      headers: {
        "Content-Type": "text/plain",
      },
      transformRequest: [(data) => data],
    });
    vscode.window.showInformationMessage("代码已成功上传到Limelight");
  } catch (error) {
    vscode.window.showErrorMessage(`上传失败: ${error}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Limelight Python Snapscript插件已激活");

  let openPreviewCommand = vscode.commands.registerCommand(
    "limelight.openPreview",
    () => {
      LimelightPanel.createOrShow(context.extensionUri);
    }
  );

  let uploadCommand = vscode.commands.registerCommand(
    "limelight.uploadCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const code = editor.document.getText();
        await uploadCode(code);
      } else {
        vscode.window.showWarningMessage("请先打开一个Python文件");
      }
    }
  );

  let saveListener = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      const config = vscode.workspace.getConfiguration("limelight");
      if (
        config.get<boolean>("autoUpdate") &&
        document.languageId === "python" &&
        LimelightPanel.currentPanel // 仅当预览窗口打开时
      ) {
        await uploadCode(document.getText());
      }
    }
  );

  context.subscriptions.push(openPreviewCommand);
  context.subscriptions.push(uploadCommand);
  context.subscriptions.push(saveListener);
}

export function deactivate() {
  if (LimelightPanel.currentPanel) {
    LimelightPanel.currentPanel.dispose();
  }
}
