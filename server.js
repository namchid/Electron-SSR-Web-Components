const electron = require('electron'),
	app = electron.app,
	BrowserWindow = electron.BrowserWindow,
	ipc = electron.ipcMain;

const express = require('express'),
	expressApp = express(),
	port = 3000

let win

// Setup for Electron app

function createWindow() {
	win = new BrowserWindow({width: 800, height: 600})
	win.loadURL(`file://${__dirname}/static/templates/index.html`)
	win.webContents.openDevTools()

	win.on('closed', () => {
		win = null
	})

	win.webContents.on('dom-ready', () => {
		// Setup for Express server

		expressApp.listen(port, () => {
			console.log("Listening on port: " + port)
		})

		expressApp.get('/', (req, res) => {
			res.end('Actualy get the HTML here, render it on the win\'s browser window\'s iframe, \
				then send the serialized DOM HTMLString as the res.')
		})
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

