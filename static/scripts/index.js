
function updateIframe(contents) {
	var iframe = document.querySelector('#webpage-preview');
	iframe.contentWindow.document.open();
	iframe.contentWindow.document.write(decodeURI(contents));
	iframe.contentWindow.document.close();
}

function getSerializedDOM() {
	var ipc = require('electron').ipcRenderer,
		serialize = require('dom-serialize');

	var nodes = document.querySelector('#webpage-preview').contentWindow.document;

	ipc.send('receiveSerializedDOM', serialize(nodes));	
}
