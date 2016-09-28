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

// Setup for Electron app

function createWindow() {
	win = new BrowserWindow({width: 800, height: 600})
	win.loadURL(`file://${__dirname}/static/templates/index.html`)
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

	// IPC functions
	ipcMain.on('receiveSerializedDOM', (_, contents) => {
		console.log(contents)
		// TODO: write serialized obj to res (use yet another callback)
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


// Server routes

expressApp.get('*\.html', (req, res) => {
	getFileContents(req, (contents) => {
		callbackUpdateIframe(contents, callbackGetDomInsideIframe)
	})

	res.end('How do I access the DOM inside the iframe? :\'(')
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
	win.webContents.executeJavaScript("getSerializedDOM('')");
}