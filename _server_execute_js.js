module.exports = function() {
  return {
    hybridVersion: function() {
      const ipcRenderer = require('electron').ipcRenderer;
      const remote = require('electron').remote;
      const directory = remote.getGlobal('directory');
      const hash = require('string-hash');
      let asyncImports = '';

      let htmlImports = document.querySelectorAll('link[rel="import"]');

      if (htmlImports.length > 0) {
        let html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        let imports = html.querySelectorAll('link[rel="import"]');
        const head = html.querySelector('head');
        let shadowPolymerScript = document.createElement('script');
        shadowPolymerScript.innerText =
            'window.Polymer = { dom: "shadow", lazyRegister: true}';
        head.insertBefore(shadowPolymerScript, imports[0]);

        let hashString = '';
        imports.forEach((linkNode) => {
          asyncImports += linkNode.outerHTML;
          hashString += linkNode['href'];
          linkNode.parentNode.removeChild(linkNode);
        });
        const hashed = hash(hashString);
        ipcRenderer.send('setAsyncImports', hashed, asyncImports);

        let newImport = html.createElement('link');
        newImport.setAttribute('rel', 'import');
        newImport.setAttribute('href', '_asyncImport' + hashed + '.html');
        newImport.setAttribute('async', '');
        html.querySelector('head').appendChild(newImport);

        // Make sure pathnames are relative
        html.querySelectorAll('[url]').forEach(
            (link) => {
                link.setAttribute('url', link.url.replace(directory, ''));
              });
        html.querySelectorAll('[src]').forEach(
            (link) => {
                link.setAttribute('src', link.src.replace(directory, ''));
              });
        html.querySelectorAll('[href]').forEach(
            (link) => {
              link.setAttribute('href', link.href.replace(directory, ''));
            });

        ipcRenderer.send('receiveSerializedDOM',
                         html.documentElement.outerHTML, false);
      } else {
        ipcRenderer.send('receiveSerializedDOM',
                         document.documentElement.outerHTML, false);
      }
    },
    shadyVersion: function() {
      const ipcRenderer = require('electron').ipcRenderer;
      const remote = require('electron').remote;
      const directory = remote.getGlobal('directory');
      const hash = require('string-hash');
      let asyncImports = '';

      let htmlImports = document.querySelectorAll('link[rel="import"]');

      if (htmlImports.length > 0) {
        let html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        let hashString = '';
        let imports = html.querySelectorAll('link[rel="import"]');
        imports.forEach((linkNode) => {
          asyncImports += linkNode.outerHTML;
          hashString += linkNode['href'];
          linkNode.parentNode.removeChild(linkNode);
        });
        const hashed = hash(hashString);
        ipcRenderer.sendSync('setAsyncImports', hashed, asyncImports);

        let newImport = html.createElement('link');
        newImport.setAttribute('rel', 'import');
        newImport.setAttribute('href',
                               '_asyncImport' + hashed + '.html');
        newImport.setAttribute('async', '');
        html.querySelector('head').appendChild(newImport);

        // Make sure pathnames are relative
        html.querySelectorAll('[url]').forEach(
            (link) => {
                link.setAttribute('url',
                  link.url.replace(directory, ''));
              });
        html.querySelectorAll('[src]').forEach(
            (link) => {
                link.setAttribute('src',
                  link.src.replace(directory, ''));
              });
        html.querySelectorAll('[href]').forEach(
            (link) => {
              link.setAttribute('href',
                link.href.replace(directory, ''));
            });

        ipcRenderer.send('receiveSerializedDOM',
                         html.documentElement.outerHTML, true);
      } else {
        ipcRenderer.send('receiveSerializedDOM',
                         document.documentElement.outerHTML, true);
      }
    },
    /** Modified from Kevin's WC-SSR (link in README)**/
    shadowVersion: function() {
      const ipcRenderer = require('electron').ipcRenderer;
      const remote = require('electron').remote;
      const directory = remote.getGlobal('directory');
      const hash = require('string-hash');
      let hashString = '';

      let asyncImports = '';
      let removedImports = new Set();

      let shadowStyleList = [];
      let shadowStyleMap = {};

      /**
      * Removes scripts.
      * @param {Object} container The element to remove scripts from.
      */
      function removeScripts(container) {
        let scripts = container.querySelectorAll('script');
        [].slice.call(scripts).forEach(function(el) {
          el.remove();
        });
      }

      /**
      * Removes HTML imports.
      * @param {Object} container The element to remove the import nodes from.
      */
      function removeImports(container) {
        const imports = container.querySelectorAll('link[rel=import]');
        [].slice.call(imports).forEach(function(el) {
          const temp = el.outerHTML;
          if (!removedImports.has(temp)) {
            hashString += el['href'];
            asyncImports += el.outerHTML + String.fromCharCode(13);
            removedImports.add(temp);
          }
          el.remove();
        });
      }

      /**
      * Removes styles in shadow roots and stores them in a template.
      * @param {Object} container The element to remove styles from.
      */
      function replaceStyles(container) {
        const styles = container.querySelectorAll('style');
        [].slice.call(styles).forEach(function(el) {
          let style = shadowStyleMap[el.textContent];
          if (!style) {
            style = el;
            shadowStyleMap[style.textContent] = style;
            style.index = shadowStyleList.length;
            style.setAttribute('shadow-style', style.index);
            shadowStyleList.push(style);
          }
          let shadowStyle = document.createElement('shadow-style');
          shadowStyle.setAttribute('index', style.index);
          el.parentNode.replaceChild(shadowStyle, el);
        });
      }

      /**
      * Remove the shadow root of an element. Does the following:
      * - Removes its script tag.
      * - Removes HTML imports.
      * - Replaces its shadow root styles and stores them as a template.
      * @param {Object} el The original element, which is not modified.
      * @param {Object} clonedEl The cloned element with modifications
      * listed above.
      */
      function replaceShadowRoot(el, clonedEl) {
        if (el.shadowRoot) {
          let shadowRoot = document.createElement('shadow-root');
          for (let e = el.shadowRoot.firstChild; e; e = e.nextSibling) {
            shadowRoot.appendChild(e.cloneNode(true));
          }
          removeImports(shadowRoot);
          replaceStyles(shadowRoot);
          replaceShadowRoots(el.shadowRoot, shadowRoot);
          clonedEl.insertBefore(shadowRoot, clonedEl.firstChild);
        }
      }

      /**
      * Removes all shadow roots from elements in the container.
      * @param {Object} container The original container, which is not modified.
      * @param {Object} clonedContainer The cloned container with modifications.
      * @return {Object} The cloned container with modifications.
      */
      function replaceShadowRoots(container, clonedContainer) {
        const elements = container.querySelectorAll('*');
        const clonedElements = clonedContainer.querySelectorAll('*');
        [].slice.call(elements).forEach(function(el, i) {
          replaceShadowRoot(el, clonedElements[i]);
        });
        return clonedContainer;
      }

      /**
      * Inserts styles removed from shadow roots into a template.
      * @param {Object} doc The document to insert the template with styles.
      * @param {Object} list The list of previously removed styles.
      */
      function insertShadowStyles(doc, list) {
        let template = document.createElement('template');
        template.setAttribute('shadow-styles', '');
        list.forEach(function(style) {
          template.content.appendChild(style);
        });
        doc.querySelector('head').appendChild(template);
      }

      /**
      * Registers custom elements by attaching shadow roots with proper styling.
      */
      function registerShadowRoot() {
        const t = document.querySelector('template[shadow-styles]');
        const shadowStyles = t && t.content.children;
        let proto = Object.create(HTMLElement.prototype);
        proto.createdCallback = function() {
          let parent = this.parentNode;
          if (parent) {
            let shadowRoot = parent.createShadowRoot();
            let child;
            while ((child = this.firstChild)) {
              if (child.localName == 'shadow-style') {
                child.remove();
                child = shadowStyles[child.getAttribute('index')].cloneNode(
                    true);
              }
              shadowRoot.appendChild(child);
            }
            this.remove();
          }
        };
        document.registerElement('shadow-root', {prototype: proto});
      }

      /**
      * Inserts script in DOM to enforce shadow DOM.
      */
      function insertPolymerShadowDom() {
        const head = document.querySelector('head');

        let scriptNode = document.createElement('script');
        scriptNode.setAttribute(
            'src',
            'bower_components/webcomponentsjs/webcomponents-lite.js');
        head.insertBefore(scriptNode, head.firstChild);

        let script = document.createElement('script');
        script.textContent =
            'window.Polymer = {dom: "shadow", lazyRegister: true}';
        head.insertBefore(script, head.firstChild.nextSibling);
      }

      /**
      * Inserts route for asynchronously requesting the HTML imports.
      * @param {String} hashedURL The hashed key corresponding to the HTML
      * imports string in the server's cache.
      */
      function insertImportLink(hashedURL) {
        let linkNode = document.createElement('link');
        linkNode.setAttribute('rel', 'import');
        linkNode.setAttribute('href', hashedURL);
        linkNode.setAttribute('async', '');
        const head = document.querySelector('head');
        head.appendChild(linkNode);
      }

      /**
      * Registers custom elements, shadow roots, and reinserts link to
      * import HTML.
      * @param {String} importURL The hashed key corresponding to the HTML
      * imports string in the server's cache.
      */
      function registerAndReinsert(importURL) {
        insertPolymerShadowDom();
        registerShadowRoot();
        insertImportLink(importURL);
      }

      /**
      * Inserts scripts for custom element registration, upgrade, and HTML
      * imports into the head of the document and executes them upon page load.
      * @param {Object} clonedDoc The DOM to insert the scripts into.
      * @param {String} hashedNum The hashed key corresponding to the HTML
      * imports string in the server's cache.
      */
      function insertScriptsAndImports(clonedDoc, hashedNum) {
        let scripts = document.createElement('script');

        scripts.textContent = insertPolymerShadowDom.toString();
        scripts.textContent +=
            String.fromCharCode(13) + registerShadowRoot.toString();
        scripts.textContent +=
            String.fromCharCode(13) + insertImportLink.toString();
        scripts.textContent += String.fromCharCode(13) + '(' +
                               registerAndReinsert.toString() +
                               ')("_asyncImport' + hashedNum + '.html");';

        clonedDoc.querySelector('head').appendChild(scripts);
      }

      const doc = document.documentElement;
      let clonedDoc = doc.cloneNode(true);
      clonedDoc.querySelector('body').removeAttribute('unresolved');

      replaceShadowRoots(doc, clonedDoc);
      removeImports(clonedDoc);
      let hashed = hash(hashString);
      if (asyncImports != '') {
        ipcRenderer.send('setAsyncImports', hashed, asyncImports);
      }
      removeScripts(clonedDoc);
      insertShadowStyles(clonedDoc, shadowStyleList);
      insertScriptsAndImports(clonedDoc, hashed);

      // Make sure pathnames are relative
      clonedDoc.querySelectorAll('[url]').forEach(
          (link) => {
              link.setAttribute('url', link.url.replace(directory, ''));
            });
      clonedDoc.querySelectorAll('[src]').forEach(
          (link) => {
              link.setAttribute('src', link.src.replace(directory, ''));
            });
      clonedDoc.querySelectorAll('[href]').forEach(
          (link) => {
              link.setAttribute('href', link.href.replace(directory, ''));
            });

      ipcRenderer.send('receiveSerializedDOM', clonedDoc.outerHTML, false);
    },
  };
};
