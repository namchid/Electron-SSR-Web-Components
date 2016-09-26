const electron = require('electron'),
	app = electron.app,
	BrowserWindow = electron.BrowserWindow,
	express = require(__dirname + '/express/app')

let win

function createWindow() {
	express()

	win = new BrowserWindow({width: 800, height: 600})
	win.loadURL(`file://${__dirname}/index.html`)
	win.webContents.openDevTools()

	win.on('closed', () => {
		win = null
	})
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
