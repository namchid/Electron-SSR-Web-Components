const electron = require('electron'),
	app = electron.app,
	BrowserWindow = electron.BrowserWindow,
	ipcMain = electron.ipcMain

const express = require('express'),
	expressApp = express(),
	port = 3000

const fs = require('fs'),
	url = require('url')

let win

var gRes = null

// Setup for Electron app

function createWindow() {
	win = new BrowserWindow({width: 800, height: 600})
	win.loadURL(`file://${__dirname}/index.html`)
	// win.loadURL(`file://${__dirname}/demo/index.html`)
	win.webContents.openDevTools()

	win.on('closed', () => {
		win = null
	})

	// Setup for Express server
	win.webContents.on('dom-ready', () => {
		expressApp.listen(port, () => {
			console.log("Listening on port: " + port)
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

// IPC functions
ipcMain.on('receiveSerializedDOM', (_, contents) => {
	gRes.end(contents)
})


// Server routes
expressApp.get('*\.html', (req, res) => {
	getFileContents(req, (contents) => {
		callbackUpdateIframe(contents, callbackGetDomInsideIframe)
	})

	gRes = res
})

expressApp.get('*', (req, res) => {
	getFileContents(req, (contents) => {
		res.end(contents)
	})
})

// Server request handlers
function getFileContents(req, callback) {
	var parsed_url = url.parse(req.url, true)
	var filename = parsed_url.pathname.substr(1)
	
	var contents = ''
	var rstream = fs.createReadStream(filename)

	rstream.on(
		'readable',
		() => {
			var data = rstream.read()
			switch(typeof data) {
				case 'string':
					contents += data
					break
				case 'object':
					if(data instanceof Buffer) {
						contents += data.toString('utf8')
					}
					break
				default:
					break
			}
		}
	)

	rstream.on(
		'end',
		() => {
			callback(contents)
		}
	)
}

// Callbacks to handle updating iFrame & getting serialized DOM object
function callbackUpdateIframe(contents, callback) {
	win.webContents.executeJavaScript("updateIframe('" + encodeURI(contents) + "')")
	callback()
}

function callbackGetDomInsideIframe() {
	win.webContents.executeJavaScript(`getSerializedDOM('')`);
}