var request = require('request');
var fs = require('fs');
var path = require('path');
var http = require('http');

var urlRegEx = /([^.\/~%]+\.pdf)/;
var badrequest = 400;

http.createServer(function(req, res) {

	var downloadUrl = function(url, token, cb) {
		if(urlRegEx.exec(url) != null) {
			var sanitizedUrl = urlRegEx.exec(url)[0];
			var filePath = "/tmp/"+sanitizedUrl;
			var file = fs.createWriteStream(filePath);
			request(
				{
					uri: url,
					timeout: 10000,
					method: "GET"
				},
				function(error, body, response) {
					if(error) {
						//cannot download file to server
						res.writeHead(response.statusCode);
						res.end();
					}
				}
			).pipe(file);
			file.on('finish', function() {
				cb(filePath, token);
			});
		}
		else {
			res.writeHead(badrequest);
			res.end();
		}
	};

	var uploadFile = function(filePath, token) {
		var box_request = request.post("https://upload.box.com/api/2.0/files/content", function(error, box_resp, body) {
			console.log(box_resp.statusCode);
			res.writeHead(box_resp.statusCode);
			res.end();

			fs.unlink(filePath, function (err) {
				console.log(err);
			});
		}).auth(null, null, true, token);

		var form = box_request.form();
		form.append("filename", fs.createReadStream(filePath));
		form.append("folder_id", "0");
	};

	if (req.method == 'POST') {
		var body = '';
        req.on('data', function (data) {
            body += data;
        });

        req.on('end', function () {
        	var keyVal = JSON.parse(body);
        	var url = keyVal["url"];
        	var access_token = keyVal["access_token"];
        	var refresh_token = keyVal["refresh_token"];
        	downloadUrl(url, access_token, uploadFile);
        });
	}
}).listen(8080);