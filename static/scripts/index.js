function updateIframe(contents) {
	var iframe = document.querySelector('#webpage-preview');
	iframe.contentWindow.document.open();
	iframe.contentWindow.document.write(decodeURI(contents));
	iframe.contentWindow.document.close();
}