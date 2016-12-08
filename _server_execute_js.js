module.exports = function() {

  return {

    hybridVersion: function() {
      console.log("DONE")
      var ipcRenderer = require('electron').ipcRenderer;
      var asyncImports = '';
      var remote = require('electron').remote;
      var directory = remote.getGlobal('directory');
      var hash = require('string-hash'); 

      var htmlImports = document.querySelectorAll('link[rel="import"]');

      if(htmlImports.length > 0) {
        var html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        var imports = html.querySelectorAll('link[rel="import"]');
        var head = html.querySelector('head');
        var shadowPolymerScript = document.createElement('script');
        shadowPolymerScript.innerText = 'window.Polymer = { dom: "shadow", lazyRegister: true}';
        head.insertBefore(shadowPolymerScript, imports[0]);

        var hashString = '';
        imports.forEach((linkNode) => {
          asyncImports += linkNode.outerHTML;
          hashString += linkNode['href'];
          linkNode.parentNode.removeChild(linkNode);
        });
        var hashed = hash(hashString)
        ipcRenderer.send('setAsyncImports', hashed, asyncImports);

        var newImport = html.createElement('link');
        newImport.setAttribute('rel', 'import');
        newImport.setAttribute('href', '_asyncImport' + hashed + '.html');
        newImport.setAttribute('async', '');
        html.querySelector('head').appendChild(newImport);

        // Make sure pathnames are relative
        html.querySelectorAll('[url]').forEach((link) => { link.setAttribute('url', link.url.replace(directory, ''))});
        html.querySelectorAll('[src]').forEach((link) => { link.setAttribute('src', link.src.replace(directory, ''))});
        html.querySelectorAll('[href]').forEach((link) => { link.setAttribute('href', link.href.replace(directory, ''))});

        ipcRenderer.send('receiveSerializedDOM', html.documentElement.outerHTML, false);
      } else {
        ipcRenderer.send('receiveSerializedDOM', document.documentElement.outerHTML, false);
      }
    },

    shadyVersion: function() {
      var ipcRenderer = require('electron').ipcRenderer;
      var asyncImports = '';
      var remote = require('electron').remote;
      var directory = remote.getGlobal('directory');
      var hash = require('string-hash'); 

      var htmlImports = document.querySelectorAll('link[rel="import"]');

      if(htmlImports.length > 0) {
        var html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        var hashString = '';
        var imports = html.querySelectorAll('link[rel="import"]');
        imports.forEach((linkNode) => {
          asyncImports += linkNode.outerHTML;
          hashString += linkNode['href'];
          linkNode.parentNode.removeChild(linkNode);
        });
        var hashed = hash(hashString)
        ipcRenderer.sendSync('setAsyncImports', hashed, asyncImports)

        var newImport = html.createElement('link');
        newImport.setAttribute('rel', 'import');
        newImport.setAttribute('href', '_asyncImport' + hashed + '.html');
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
    },

    /** Modified from Kevin's WC-SSR (link in README)**/
    shadowVersion: function() {
      var ipcRenderer = require('electron').ipcRenderer;
      var importsString = '';
      var removedImports = new Set();

      var shadowStyleList = [];
      var shadowStyleMap = {};

      function removeScripts(container) {
        var scripts = container.querySelectorAll('script');
        [].slice.call(scripts).forEach(function(el) {
          el.remove();
        });
      }

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

      function replaceShadowRoots(container, clonedContainer) {
        var elements = container.querySelectorAll('*');
        var clonedElements = clonedContainer.querySelectorAll('*');
        [].slice.call(elements).forEach(function(el, i) {
          replaceShadowRoot(el, clonedElements[i]);
        });
        return clonedContainer;
      }

      function insertShadowStyles(doc, list) {
        var template = document.createElement('template');
        template.setAttribute('shadow-styles', '');
        list.forEach(function(style) {
          template.content.appendChild(style);
        });
        doc.querySelector('head').appendChild(template);
      }

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

      function insertPolymerShadowDom() {
        var head = document.querySelector('head');

        var scriptNode = document.createElement('script');
        scriptNode.setAttribute('src', 'bower_components/webcomponentsjs/webcomponents-lite.js');
        head.insertBefore(scriptNode, head.firstChild);

        var script = document.createElement('script');
        script.textContent = 'window.Polymer = {dom: "shadow", lazyRegister: true}';
        head.insertBefore(script, head.firstChild.nextSibling);
      }

      function insertImportLink() {
        var linkNode = document.createElement('link');
        linkNode.setAttribute('rel', 'import');
        linkNode.setAttribute('href', '_shadowAsyncFile.html');
        linkNode.setAttribute('async', '');
        var head = document.querySelector('head');
        head.appendChild(linkNode);
      }

      function registerAndReinsert() {
        insertPolymerShadowDom();
        registerShadowRoot();
        insertImportLink();
      }

      function insertScriptsAndImports(clonedDoc) {
        var scripts = document.createElement('script');

        scripts.textContent = insertPolymerShadowDom.toString();
        scripts.textContent += String.fromCharCode(13) + registerShadowRoot.toString();
        scripts.textContent += String.fromCharCode(13) + insertImportLink.toString();
        scripts.textContent += String.fromCharCode(13) + '(' + registerAndReinsert.toString() + ')();';

        clonedDoc.querySelector('head').appendChild(scripts);
      }

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
    }

  }

}