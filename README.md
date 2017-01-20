# Server Side Rendering of Web Components

This project is a proof-of-concept for server-side rendering of Polymer web components using an [Electron] server. Server-side rendering of web components provides several benefits, including faster initial load time, indexability of the web components for SEO purposes, and exposure of their content for content previews. 

## Overview

The server currently has three approaches for the rendering. The first approach deals with documents that use Polymer's [shady DOM]. The second approach is for documents that use native [shadow DOM]. The third is a hybrid approach that first sends down Shady CSS and later upgrades the custom elements to use shadow DOM. This approach was inspired by issues encountered in the other two.

## Setup

### Installation
Before setting up, install [Node.js] and npm.

Install Electron:
```
npm install electron --save-dev
```

or globally:
```
npm install -g electron
```

Install Bower:
```
npm install bower
```

Clone the project:
```
git clone git@github.com:namchid/Electron-SSR-Web-Components.git
```

### Manual Configurations

**Note:** This is not recommended when setting up the server environment for the first time. Instead, skip to the ***Guided Configurations*** subsection below.

Install/update packages for Polymer and Node. **Note:** This step will set up server dependencies, but not download example tests; see ***Guided Configurations*** below.
```
bower update
npm update
```

**Optionally**, use a modified, unoffical version Polymer 1.0 does not attach multiple shadow roots. If you do not want to do that at this time, skip to ***Running the Server***.

Check out Polymer:
```
git clone https://github.com/Polymer/polymer.git
```

Create a symlink for the downloaded Polymer folder:
```
npm link polymer/@polymer/polymer
```

Replace the Polymer `shadow.html` file:
```
mv _modified_polymer_shadow.html polymer/node_modules/\@polymer/polymer/src/mini/shadow.html
```

Replace paths in `bower_components`. **Note:** If this file has been changed, modify it manually or redownload it from this repository.
```
javac BowerToNPM.java
java BowerToNPM -s < _default_bower_to_npm_inputs.txt
```

### Guided Configurations

**Note:** This is the alternative to the ***Manual Configurations*** subsection above. The `runme` and `BowerToNPM` class are designed for macOS and Linux-based systems (sorry, Windows users). If you have already followed the steps above, you can still run this to choose your settings.

Execute the `runme` script to install Polymer and Node packages (same as previous step) and download files for testing:
```
./runme -h
```

By default, executing the `runme` will update Bower components and node modules. It will NOT download examples or use the modified Polymer version. To do so, use the following flags and follow instructions:
```
./runme -pe
```

### Running the Server

```
electron .
```

If all the dependencies are present and this project is configured correctly, you should see something like this in the console:
```
Shady ngrok url: https://133d08a1.ngrok.io
Shadow ngrok url: https://0d2c7ec2.ngrok.io
```
These are URLs randomly generated by ngrok for secure tunneling of locally hosted servers. See the ***Testing Server Performance*** section below for more details, or visit the [ngrok repository].

### Viewing the Results
Executing the `runme` will automatically download some test cases. The test cases that use shady DOM follow the naming format `index[0-9]*.html`; ones that use shadow DOM follow the naming format of `index[0-9]*shadow.html`.

To see the server-rendered results, navigate to the browser. For server-rendered pages that use shady DOM, go to port 3000. For pages that use shadow DOM, go to port 4000. Alternatively, you can use to one of the corresponding, generated [ngrok] URLs logged in the console.

Example:
```
https://localhost:3000/index.html
https://localhost:4000/indexshadow.html
```

### Adding Custom Test Cases
Documents that use shady DOM must follow this naming convention: `index[0-9]*.html`. Those that use shadow DOM must follow this naming convention: `index[0-9]*shadow.html`. When adding additional test cases, add the index or main HTML files to root directory. Add all other files in the `src` folder.

If you prefer a different naming scheme or directory structure, add or modify the routes in `_server.js`.

### Testing Server Performance
One way to test the performance of this server is through [WebpageTest]. Because ngrok exposes the server to the Internet, you can use the generated ngrok URL followed by the name of the file to test. 

## Additional Notes

Parts of the JavaScript code executed on the server for serving documents that use shadow DOM are adapted from Kevin Schaaf's [WC-SSR].

At the moment there are separate routes for rendering pages with shady and shadow DOM (see the ***Viewing the Results*** subsection under the ***Setup*** section). Eventually, 

The hybrid version mentioned in ***Overview*** is currently not hooked in, but it is easy to do so by adding another route in `_server.js`.

This project works best on Chrome. Compatibility in other browsers is not assured.

## Related Links

For more backgorund on this project, read [web components] and the [Polymer] library.

[Electron]: <https://github.com/electron/electron>
[ngrok repository]: <https://github.com/inconshreveable/ngrok>
[Node.js]: <https://docs.npmjs.com/getting-started/installing-node#installing-nodejs>
[shadow dom]: <https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM>
[shady dom]: <https://www.polymer-project.org/1.0/blog/shadydom>
[Polymer]: <https://www.polymer-project.org/>
[WC-SSR]: <https://github.com/kevinpschaaf/wc-ssr>
[web components]: <http://webcomponents.org/>
[WebpageTest]: <https://www.webpagetest.org/>