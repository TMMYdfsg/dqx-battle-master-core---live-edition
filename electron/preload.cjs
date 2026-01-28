const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  getSources: () => ipcRenderer.invoke('desktop:getSources')
});

// ウィンドウ操作API（カスタムタイトルバー用）
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized')
});

// オーバーレイAPI
contextBridge.exposeInMainWorld('overlay', {
  // オーバーレイウィンドウを開く
  open: (bounds) => ipcRenderer.invoke('overlay:open', bounds),
  
  // オーバーレイウィンドウを閉じる
  close: () => ipcRenderer.invoke('overlay:close'),
  
  // オーバーレイの位置・サイズを更新
  setBounds: (bounds) => ipcRenderer.invoke('overlay:setBounds', bounds),
  
  // オーバーレイにデータを送信
  updateData: (data) => ipcRenderer.send('overlay:updateData', data),
  
  // クリックスルーの切り替え
  setClickThrough: (enabled) => ipcRenderer.invoke('overlay:setClickThrough', enabled),
  
  // 表示/非表示
  setVisible: (visible) => ipcRenderer.invoke('overlay:setVisible', visible),
  
  // 透明度設定
  setOpacity: (opacity) => ipcRenderer.invoke('overlay:setOpacity', opacity),
  
  // オーバーレイウィンドウでデータを受信
  onData: (callback) => {
    ipcRenderer.on('overlay:data', (event, data) => callback(data));
  },
  
  // リスナー解除
  removeDataListener: () => {
    ipcRenderer.removeAllListeners('overlay:data');
  }
});
