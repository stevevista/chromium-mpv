const { BrowserWindow, app } = require('electron')
const path = require('path')

const pluginPath = path.join(__dirname, 'ppapi/build/Release', 'mpv-win32-x64-pepper_49.dll')

app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch("register-pepper-plugins", `${pluginPath};application/x-player`);

app.on("ready", () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 574,
    autoHideMenuBar: true,
    title: "mpv example player",
    webPreferences: {
      plugins: true,
      nodeIntegration: false, 
      webSecurity: true,
      javascript: true
    },
  });
  win.setMenu(null);
  win.loadURL(`file://${__dirname}/mpv.html`);

  win.webContents.openDevTools({ mode: 'detach' });
})

app.on("window-all-closed", () => {
  app.quit();
});
