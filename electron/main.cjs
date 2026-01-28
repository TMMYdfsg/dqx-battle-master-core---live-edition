const { app, BrowserWindow, dialog, desktopCapturer, ipcMain, session, screen } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

let mainWindow;
let overlayWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#020408',
    frame: false,                // フレームレス（カスタムタイトルバー用）
    titleBarStyle: 'hidden',     // タイトルバーを非表示
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const devServerUrl = process.env.ELECTRON_START_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });
};

/**
 * クリックスルー対応オーバーレイウィンドウを作成
 */
const createOverlayWindow = (targetBounds) => {
  if (overlayWindow) {
    overlayWindow.close();
  }

  // プライマリディスプレイを取得
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: targetBounds?.width || width,
    height: targetBounds?.height || height,
    x: targetBounds?.x || 0,
    y: targetBounds?.y || 0,
    transparent: true,           // 透明背景
    backgroundColor: '#00000000', // 完全透明（ARGB）
    frame: false,                // フレームなし
    alwaysOnTop: true,           // 常に最前面
    skipTaskbar: true,           // タスクバーに表示しない
    resizable: false,
    movable: false,
    focusable: false,            // フォーカスを受け取らない
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  // クリックスルーを有効化（マウスイベントを下のウィンドウに通過させる）
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  // オーバーレイHTMLをロード
  const devServerUrl = process.env.ELECTRON_START_URL;
  if (devServerUrl) {
    overlayWindow.loadURL(`${devServerUrl}#/overlay`);
  } else {
    overlayWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: '/overlay'
    });
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
};

const getCaptureSources = async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 180 }
  });
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }));
};

const getLocalReleaseNotesJa = () => {
  try {
    const notesPath = path.join(__dirname, '..', 'release-notes-ja.md');
    if (fs.existsSync(notesPath)) {
      return fs.readFileSync(notesPath, 'utf-8');
    }
  } catch (error) {
    console.warn('Failed to read local release notes:', error);
  }
  return '更新内容の詳細は配布元のページをご確認ください。';
};

const initAutoUpdater = () => {
  if (process.env.ELECTRON_START_URL) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    console.error('AutoUpdater error:', error);
  });

  autoUpdater.on('update-available', async (info) => {
    const releaseNotes = (typeof info.releaseNotes === 'string' && info.releaseNotes.trim())
      ? info.releaseNotes
      : getLocalReleaseNotesJa();

    dialog.showMessageBox({
      type: 'info',
      title: 'アップデートを検出しました',
      message: `新しいバージョン (${info.version}) をダウンロードします。`,
      detail: releaseNotes
    }).catch(() => undefined);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available.');
  });

  autoUpdater.on('update-downloaded', async () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'アップデートを適用します',
      message: '更新の準備ができました。数秒後に再起動して更新します。'
    }).catch(() => undefined);

    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 3000);
  });

  const check = () => autoUpdater.checkForUpdates().catch((error) => {
    console.error('Failed to check for updates:', error);
  });

  // 起動直後のチェック
  setTimeout(check, 5000);

  // 定期チェック（6時間ごと）
  setInterval(check, 6 * 60 * 60 * 1000);
};

app.whenReady().then(() => {
  // キャプチャソース取得
  ipcMain.handle('desktop:getSources', async () => {
    return getCaptureSources();
  });

  // ウィンドウ操作（カスタムタイトルバー用）
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
    return true;
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
    return true;
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // オーバーレイウィンドウを開く
  ipcMain.handle('overlay:open', async (event, bounds) => {
    createOverlayWindow(bounds);
    return true;
  });

  // オーバーレイウィンドウを閉じる
  ipcMain.handle('overlay:close', async () => {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
    return true;
  });

  // オーバーレイの位置・サイズを更新
  ipcMain.handle('overlay:setBounds', async (event, bounds) => {
    if (overlayWindow && bounds) {
      overlayWindow.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
    }
    return true;
  });

  // オーバーレイにデータを送信
  ipcMain.on('overlay:updateData', (event, data) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('overlay:data', data);
    }
  });

  // オーバーレイのクリックスルー切り替え
  ipcMain.handle('overlay:setClickThrough', async (event, enabled) => {
    if (overlayWindow) {
      overlayWindow.setIgnoreMouseEvents(enabled, { forward: true });
    }
    return true;
  });

  // オーバーレイの表示/非表示
  ipcMain.handle('overlay:setVisible', async (event, visible) => {
    if (overlayWindow) {
      if (visible) {
        overlayWindow.show();
      } else {
        overlayWindow.hide();
      }
    }
    return true;
  });

  // オーバーレイの透明度設定
  ipcMain.handle('overlay:setOpacity', async (event, opacity) => {
    if (overlayWindow) {
      overlayWindow.setOpacity(opacity);
    }
    return true;
  });

  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const preferred = sources.find(source => source.id.startsWith('screen:')) || sources[0];
      callback({ video: preferred, audio: 'loopback' });
    } catch (error) {
      console.error('Display media request failed:', error);
      callback({});
    }
  });

  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
