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
var asyncFile = 'asyncFile.html'
var asyncImports = ''

// Setup for Electron app
function createWindow() {
    win = new BrowserWindow({width: 800, height: 600})
    win.loadURL(`file://${__dirname}/_server_index.html`)
    win.webContents.openDevTools()

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
    gRes.end(contents)
})

ipcMain.on('setAsyncImports', (_, contents) => {
    asyncImports = contents
})

expressApp.get(pjson['entry-pages'], (req, res) => {
    win.loadURL('file://' + __dirname + req.url)
    gRes = res
    gReq = req

    win.webContents.on('did-finish-load', () => {
        getDOMInsidePage()
    })
})

expressApp.get('/asyncFile.html', (req, res) => {
    res.end(asyncImports)
    // asyncImports = ''
})

expressApp.get('/*', (req, res) => {
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

        var htmlImportsString = '';
        var htmlImportsSet = false;

        function handleHTMLImports() {
            htmlImportsString = '';

            var htmlImports = document.querySelectorAll('link[rel="import"]');
            for(var i = 0; i < htmlImports.length; i++) {
                htmlImportsString += '<link ' + getAttributeString(htmlImports[i]).slice(0, -1) + '></link>';
            }
        }

        function getAttributeString(node) {
            var attributeString = '';

            var attributes = [];
            var values = [];

            for(var i = 0; i < node.attributes.length; i++) {
                var curr = node.attributes[i];
                attributes.push(curr.nodeName);
                values.push(curr.nodeValue);
            }

            for(var i = 0; i < attributes.length; i++) {
                attributeString += attributes[i] + '="' + values[i] + '" ';
            }

            return attributeString;
        }

        function recurseParseDOM(node) {
            if (node == null) return '';

            var tag = node.tagName;
            var openTag = '';
            var closeTag = '';

            var htmlString = '';

            if(tag) {
                tag = tag.toLowerCase();

                var attributeString = ' ';

                // don't serialize this
                if(tag === 'link' && node.getAttribute('rel') === 'import') {
                    if(!htmlImportsSet) {
                        openTag = '<link rel="import" href="asyncFile.html" async>';
                        closeTag = '</link>';
                        htmlImportsSet = true;
                    }
                } else {
                    attributeString += + getAttributeString(node);
                    openTag = '<' + tag + attributeString.slice(0, -1) + '>';
                    closeTag = '</' + tag + '>';
                }
            }

            htmlString += openTag;

            // get inner html
            if(node.childNodes) {
                htmlString += parseChildNodes(node.childNodes);
            }
            if(node.shadowRoot) {
                htmlString += parseChildNodes(node.shadowRoot.childNodes);
            }

            htmlString += closeTag;

            return htmlString;
        }

        function parseChildNodes(nodes) {

            var htmlString = '';

            for(var i = 0; i < nodes.length; i++) {
                var nodeType = nodes[i].nodeType;

                if(nodeType == 3) {
                    htmlString += nodes[i].nodeValue;
                } else if(nodeType == 8) {
                    htmlString += '<!--' + nodes[i].nodeValue + '-->';
                } else {
                    if(nodes[i].childNodes || nodes[i].shadowRoot) {
                        htmlString += recurseParseDOM(nodes[i]);
                    }
                }
            }

            return htmlString;
        }

        handleHTMLImports();
        ipc.send('setAsyncImports', htmlImportsString);

        ipc.send('receiveSerializedDOM', recurseParseDOM(document.documentElement));
    `);
}