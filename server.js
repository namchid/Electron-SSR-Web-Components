const pjson = require('./package')

const electron = require('electron'),
	app = electron.app,
	BrowserWindow = electron.BrowserWindow,
	ipcMain = electron.ipcMain

const express = require('express'),
	expressApp = express(),
	port = 3000,
    path = require('path')

const fs = require('fs'),
	url = require('url')

let win

var mimeType = ''
var listening = false
var gRes = null, gReq = null
var regExp = ''

// Setup for Electron app
function createWindow() {
	win = new BrowserWindow({width: 800, height: 600})
	win.loadURL(`file://${__dirname}/_server_index.html`)
	win.webContents.openDevTools()

    regExp = new RegExp(pjson['entry-pages'].join("|"),'i')

	win.on('closed', () => {
		win = null
	})

	// Setup for Express server
	win.webContents.on('dom-ready', () => {
		startServer();
	})
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
        stopServer()
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
	gRes.end('<html>' + contents + '</html>')
})

expressApp.get(regExp, (req, res) => {
    win.loadURL('file://' + __dirname + req.url)
    gRes = res
    gReq = req

    win.webContents.on('did-finish-load', () => {
        getDOMInsidePage()
    })
})

expressApp.get('*', (req, res) => {
    var parsed_url = url.parse(req.url, true)
    var filename = parsed_url.pathname.substr(1)

    var p = path.join(__dirname, filename)
    res.sendFile(p)
})

// Express Server
function startServer() {
    if(!listening) {
        expressApp.listen(port, () => {
            expressApp.emit('listening', null)
        })
    }
}

function stopServer() {
    expressApp.close()
}

expressApp.on('listening', () => {
    listening = true
})

function getDOMInsidePage() {
    win.webContents.executeJavaScript(`
        var ipc = require('electron').ipcRenderer;
        var nodes = document.documentElement.innerHTML;
        ipc.send('receiveSerializedDOM', nodes.toString());  
    `);
}