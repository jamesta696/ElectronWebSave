const {app, BrowserWindow} = require('electron');
const ipc = require('electron').ipcMain;

let mainWindow;



app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 1024, height: 768 });
  mainWindow.loadURL('file://' + __dirname + '/browser.html');
  mainWindow.openDevTools();
});


ipc.on('update-notify-value', function (event, arg) {
  win.webContents.send('targetPriceVal', arg)
})