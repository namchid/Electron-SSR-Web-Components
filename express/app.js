module.exports = () => {

	const express = require('express'),
		app = express()
		port = 3000

	app.listen(port, () => {
		console.log("Listening on port: " + port)
	});
	 
	app.get('/', (req, res) => {
  		res.send('Hello World!');
	});

}