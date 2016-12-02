const electron = require('electron'),
  app = electron.app,
  BrowserWindow = electron.BrowserWindow,
  ipcMain = electron.ipcMain

global.directory = 'file://' + __dirname + '/'

const shadyServer = require('express')(),
  shadowServer = require('express')(),
  shadyPort = 3000,
  shadowPort = 4000,
  path = require('path'),
  ngrok = require('ngrok')

const fs = require('fs'),
  url = require('url')

let win

var listening = false,
  shadyRes = null,
  shadowRes = null,
  shadyAsyncImports = '',
  shadowAsyncImports = ''

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
ipcMain.on('receiveSerializedDOM', (_, contents, isShady) => {
  if(isShady) {
    shadyRes.end(contents)
  } else {
    shadowRes.end(contents)
  }
})

ipcMain.on('setShadyAsyncImports', (_, contents) => {
  shadyAsyncImports = contents
})

ipcMain.on('setShadowAsyncImports', (_, contents) => {
  shadowAsyncImports = contents
})

shadyServer.get(/\/index[0-9]*.html/, (req, res) => {
  win.loadURL('file://' + __dirname + req.url)
  shadyRes = res

  win.webContents.on('did-finish-load', () => {
    shadyGetDOMInsidePage()
  })
})

shadowServer.get(/\/index[0-9]*shadow.html/, (req, res) => {
  win.loadURL('file://' + __dirname + req.url)
  shadowRes = res

  win.webContents.on('did-finish-load', () => {
    shadowGetDOMInsidePage()
  })
})

shadyServer.get('/_shadyAsyncFile.html', (req, res) => {
  res.end(shadyAsyncImports)
  shadyAsyncImports = ''
})

shadowServer.get('/_shadowAsyncFile.html', (req, res) => {
  res.end(shadowAsyncImports)
  shadowAsyncImports = ''
})

shadyServer.get('/*', returnRequest)

shadowServer.get('/*', returnRequest)

// Express Server
function startServer() {
  if(!listening) {
    shadyServer.listen(shadyPort)

    shadowServer.listen(shadowPort, () => {
      shadowServer.emit('listening', null)
    })

    ngrok.connect(shadyPort, (err, url) => { console.log('Shady ngrok url: ' + url) })
    ngrok.connect(shadowPort, (err, url) => { console.log('Shadow ngrok url: ' + url) })

  }
}

function stopServer() {
  shadyServer.close()
  shadowServer.close()
}

function returnRequest(req, res) {
  var parsed_url = url.parse(req.url, true)
  var filename = parsed_url.pathname.substr(1)

  var p = path.join(__dirname, filename)
  res.sendFile(p)
}

shadowServer.on('listening', () => {
  listening = true
})

function shadyGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    var ipcRenderer = require('electron').ipcRenderer;
    var asyncImports = '';
    var remote = require('electron').remote;
    var directory = remote.getGlobal('directory');

    var htmlImports = document.querySelectorAll('link[rel="import"]');

    if(htmlImports.length > 0) {
      var html = document.cloneNode(true);
      html.querySelector('body').removeAttribute('unresolved');

      var imports = html.querySelectorAll('link[rel="import"]');
      imports.forEach((linkNode) => {
        asyncImports += linkNode.outerHTML;
        linkNode.parentNode.removeChild(linkNode);
      });
      ipcRenderer.send('setShadyAsyncImports', asyncImports);

      var newImport = html.createElement('link');
      newImport.setAttribute('rel', 'import');
      newImport.setAttribute('href', '_shadyAsyncFile.html');
      newImport.setAttribute('async', '');
      html.querySelector('head').appendChild(newImport);

      // Make sure pathnames are relative
      html.querySelectorAll('[url]').forEach((link) => { link.setAttribute('url', link.url.replace(directory, ''))});
      html.querySelectorAll('[src]').forEach((link) => { link.setAttribute('src', link.src.replace(directory, ''))});
      html.querySelectorAll('[href]').forEach((link) => { link.setAttribute('href', link.href.replace(directory, ''))});


      ipcRenderer.send('receiveSerializedDOM', html.documentElement.outerHTML, true);
    } else {
      ipcRenderer.send('receiveSerializedDOM', document.documentElement.outerHTML, true);
    }
  `);
}

function shadowGetDOMInsidePage() {

  /** Modified from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    var ipcRenderer = require('electron').ipcRenderer;
    var importsString = '';
    var removedImports = new Set();

    var shadowStyleList = [];
    var shadowStyleMap = {};
    `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function removeScripts(container) {
      var scripts = container.querySelectorAll('script');
      [].slice.call(scripts).forEach(function(el) {
        el.remove();
      });
    }
    `);

  /** Modified from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function removeImports(container) {
      var imports = container.querySelectorAll('link[rel=import]');
      [].slice.call(imports).forEach(function(el) {
        var temp = el.outerHTML;
        if(!removedImports.has(temp)) {
          importsString += el.outerHTML + String.fromCharCode(13);
          removedImports.add(temp);
        }
        el.remove();
      });
    }
    `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function replaceStyles(container) {
      var styles = container.querySelectorAll('style');
      [].slice.call(styles).forEach(function(el) {
        var style = shadowStyleMap[el.textContent];
        if (!style) {
          style = el;
          shadowStyleMap[style.textContent] = style;
          style.index = shadowStyleList.length;
          style.setAttribute('shadow-style', style.index);
          shadowStyleList.push(style);
        }
        var shadowStyle = document.createElement('shadow-style');
        shadowStyle.setAttribute('index', style.index);
        el.parentNode.replaceChild(shadowStyle, el);
      });
    }
    `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function replaceShadowRoot(el, clonedEl) {
      if (el.shadowRoot) {
        var shadowRoot = document.createElement('shadow-root');
        for (var e=el.shadowRoot.firstChild; e; e=e.nextSibling) {
          shadowRoot.appendChild(e.cloneNode(true));
        }
        removeImports(shadowRoot);
        replaceStyles(shadowRoot);
        replaceShadowRoots(el.shadowRoot, shadowRoot);
        clonedEl.insertBefore(shadowRoot, clonedEl.firstChild);
      }
    }
    `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function replaceShadowRoots(container, clonedContainer) {
      var elements = container.querySelectorAll('*');
      var clonedElements = clonedContainer.querySelectorAll('*');
      [].slice.call(elements).forEach(function(el, i) {
        replaceShadowRoot(el, clonedElements[i]);
      });
      return clonedContainer;
    }
    `);
  
  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function insertShadowStyles(doc, list) {
      var template = document.createElement('template');
      template.setAttribute('shadow-styles', '');
      list.forEach(function(style) {
        template.content.appendChild(style);
      });
      doc.querySelector('head').appendChild(template);
    }
    `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function registerShadowRoot() {
      var t = document.querySelector('template[shadow-styles]');
      var shadowStyles = t && t.content.children;
      var proto = Object.create(HTMLElement.prototype);
      proto.createdCallback = function() {
        var parent = this.parentNode;
        if (parent) {
          var shadowRoot = parent.createShadowRoot();
          var child;
          while ((child = this.firstChild)) {
            if (child.localName == 'shadow-style') {
              child.remove();
              child = shadowStyles[child.getAttribute('index')].cloneNode(true);
            }
            shadowRoot.appendChild(child);
          }
          this.remove();
        }
      };
      document.registerElement('shadow-root', {prototype: proto});
    }
    `);

  win.webContents.executeJavaScript(`
    function insertPolymerShadowDom() {
      var head = document.querySelector('head');

      var scriptNode = document.createElement('script');
      scriptNode.setAttribute('src', 'bower_components/webcomponentsjs/webcomponents-lite.js');
      head.insertBefore(scriptNode, head.firstChild);

      var script = document.createElement('script');
      script.textContent = 'window.Polymer = {dom: "shadow", lazyRegister: true}';
      head.insertBefore(script, head.firstChild.nextSibling);
    }
    `);

  win.webContents.executeJavaScript(`
    function insertImportLink() {
      var linkNode = document.createElement('link');
      linkNode.setAttribute('rel', 'import');
      linkNode.setAttribute('href', '_shadowAsyncFile.html');
      linkNode.setAttribute('async', '');
      var head = document.querySelector('head');
      head.appendChild(linkNode);
    }
    `);

  win.webContents.executeJavaScript(`
    function registerAndReinsert() {
      insertPolymerShadowDom();
      registerShadowRoot();
      insertImportLink();
    }
    `);

  win.webContents.executeJavaScript(`
    function insertScriptsAndImports(clonedDoc) {
      var scripts = document.createElement('script');

      scripts.textContent = insertPolymerShadowDom.toString();
      scripts.textContent += String.fromCharCode(13) + registerShadowRoot.toString();
      scripts.textContent += String.fromCharCode(13) + insertImportLink.toString();
      scripts.textContent += String.fromCharCode(13) + '(' + registerAndReinsert.toString() + ')();';

      clonedDoc.querySelector('head').appendChild(scripts);
    }
    `);

  /** Modified from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    var doc = document.documentElement;
    var clonedDoc = doc.cloneNode(true);
    clonedDoc.querySelector('body').removeAttribute('unresolved');

    replaceShadowRoots(doc, clonedDoc);
    removeImports(clonedDoc);
    if(importsString != '') {
      ipcRenderer.send('setShadowAsyncImports', importsString);
    }
    removeScripts(clonedDoc);
    insertShadowStyles(clonedDoc, shadowStyleList);
    insertScriptsAndImports(clonedDoc);

    ipcRenderer.send('receiveSerializedDOM', clonedDoc.outerHTML, false);
    `);
}
