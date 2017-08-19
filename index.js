var Package = require("./package.json");

var OSS = require('ali-oss'),
	mime = require("mime"),
	uuid = require("uuid").v4,
	fs = require("fs"),
	request = require("request"),
	winston = module.parent.require("winston"),
	gm = require("gm"),
	im = gm.subClass({imageMagick: true}),
	meta = module.parent.require("./meta"),
	db = module.parent.require("./database");

var plugin = {}

"use strict";

var client = null;
var settings = {
	"accessKeyId": false,
	"secretAccessKey": false,
	"region": process.env.OSS_DEFAULT_REGION || "oss-cn-hangzhou",
	"bucket": process.env.OSS_UPLOADS_BUCKET || undefined,
	"path": process.env.OSS_UPLOADS_PATH || undefined
};

var accessKeyIdFromDb = false;
var secretAccessKeyFromDb = false;

function fetchSettings(callback) {
	db.getObjectFields(Package.name, Object.keys(settings), function (err, newSettings) {
		if (err) {
			winston.error(err.message);
			if (typeof callback === "function") {
				callback(err);
			}
			return;
		}

		accessKeyIdFromDb = false;
		secretAccessKeyFromDb = false;

		if (newSettings.accessKeyId) {
			settings.accessKeyId = newSettings.accessKeyId;
			accessKeyIdFromDb = true;
		} else {
			settings.accessKeyId = false;
		}

		if (newSettings.secretAccessKey) {
			settings.secretAccessKey = newSettings.secretAccessKey;
			secretAccessKeyFromDb = false;
		} else {
			settings.secretAccessKey = false;
		}

		if (!newSettings.bucket) {
			settings.bucket = process.env.OSS_UPLOADS_BUCKET || "";
		} else {
			settings.bucket = newSettings.bucket;
		}

		if (!newSettings.host) {
			settings.host = process.env.OSS_UPLOADS_HOST || "";
		} else {
			settings.host = newSettings.host;
		}

		if (!newSettings.path) {
			settings.path = process.env.OSS_UPLOADS_PATH || "";
		} else {
			settings.path = newSettings.path;
		}

		if (!newSettings.region) {
			settings.region = process.env.OSS_DEFAULT_REGION || "";
		} else {
			settings.region = newSettings.region;
		}

		if (settings.accessKeyId && settings.secretAccessKey && settings.region) {
			client = new OSS.Wrapper({
				region: settings.region,
				accessKeyId: settings.accessKeyId,
				accessKeySecret: settings.secretAccessKey
			});
		}

		if (typeof callback === "function") {
			callback();
		}
	});
}

function OSSClient() {
	if (!client) {
		fetchSettings();
	}

	return client;
}

function makeError(err) {
	if (err instanceof Error) {
		err.message = Package.name + " :: " + err.message;
	} else {
		err = new Error(Package.name + " :: " + err);
	}

	winston.error(err.message);
	return err;
}

plugin.activate = function () {
	fetchSettings();
};

plugin.deactivate = function () {
	client = null;
};

plugin.load = function (params, callback) {
	fetchSettings(function (err) {
		if (err) {
			return winston.error(err.message);
		}
		var adminRoute = "/admin/plugins/ali-oss";

		params.router.get(adminRoute, params.middleware.applyCSRF, params.middleware.admin.buildHeader, renderAdmin);
		params.router.get("/api" + adminRoute, params.middleware.applyCSRF, renderAdmin);

		params.router.post("/api" + adminRoute + "/osssettings", OSSsettings);
		params.router.post("/api" + adminRoute + "/credentials", credentials);

		callback();
	});
};

function renderAdmin(req, res) {
	// Regenerate csrf token
	var token = req.csrfToken();

	var Config = require("./../../config.json");
	var forumPath = "";
	if(Config.url){
		forumPath = forumPath+String(Config.url);
	}
	if(forumPath.split("").reverse()[0] != "/" ){
		forumPath = forumPath + "/";
	}
	var data = {
		bucket: settings.bucket,
		host: settings.host,
		path: settings.path,
		forumPath: forumPath,
		region: settings.region,
		accessKeyId: (accessKeyIdFromDb && settings.accessKeyId) || "",
		secretAccessKey: (accessKeyIdFromDb && settings.secretAccessKey) || "",
		csrf: token
	};

	res.render("admin/plugins/ali-oss", data);
}

function OSSsettings(req, res, next) {
	var data = req.body;
	var newSettings = {
		bucket: data.bucket || "",
		host: data.host || "",
		path: data.path || "",
		region: data.region || ""
	};

	saveSettings(newSettings, res, next);
}

function credentials(req, res, next) {
	var data = req.body;
	var newSettings = {
		accessKeyId: data.accessKeyId || "",
		secretAccessKey: data.secretAccessKey || ""
	};

	saveSettings(newSettings, res, next);
}

function saveSettings(settings, res, next) {
	db.setObject(Package.name, settings, function (err) {
		if (err) {
			return next(makeError(err));
		}

		fetchSettings();
		res.json("Saved!");
	});
}

plugin.uploadImage = function (data, callback) {
	var image = data.image;

	if (!image) {
		winston.error("invalid image" );
		return callback(new Error("invalid image"));
	}

	//check filesize vs. settings
	if (image.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize );
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}

	var type = image.url ? "url" : "file";

	if (type === "file") {
		if (!image.path) {
			return callback(new Error("invalid image path"));
		}

		fs.readFile(image.path, function (err, buffer) {
			uploadToOSS(image.name, err, buffer, callback);
		});
	}
	else {
		var filename = image.url.split("/").pop();

		var imageDimension = parseInt(meta.config.profileImageDimension, 10) || 128;

		// Resize image.
		im(request(image.url), filename)
			.resize(imageDimension + "^", imageDimension + "^")
			.setFormat('png')
			.stream(function (err, stdout, stderr) {
				if (err) {
					return callback(makeError(err));
				}

				// This is sort of a hack - We"re going to stream the gm output to a buffer and then upload.
				// See https://github.com/aws/aws-sdk-js/issues/94
				var buf = new Buffer(0);
				stdout.on("data", function (d) {
					buf = Buffer.concat([buf, d]);
				});
				stdout.on("end", function () {
					uploadToOSS(filename, null, buf, callback);
				});
			});
	}
};

plugin.uploadFile = function (data, callback) {
	var file = data.file;

	if (!file) {
		return callback(new Error("invalid file"));
	}

	if (!file.path) {
		return callback(new Error("invalid file path"));
	}

	//check filesize vs. settings
	if (file.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize );
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}

	fs.readFile(file.path, function (err, buffer) {
		uploadToOSS(file.name, err, buffer, callback);
	});
};

function uploadToOSS(filename, err, buffer, callback) {
	if (err) {
		return callback(makeError(err));
	}

	var ossPath;
	if (settings.path && 0 < settings.path.length) {
		ossPath = settings.path;

		if (!ossPath.match(/\/$/)) {
			// Add trailing slash
			ossPath = ossPath + "/";
		}
	}
	else {
		ossPath = "/";
	}

	var ossKeyPath = ossPath.replace(/^\//, ""); // OSS Key Path should not start with slash.

	var params = {
		Bucket: settings.bucket,
		ACL: "public-read",
		Key: ossKeyPath + uuid() + '.' + mime.extension(mime.lookup(filename)),
		Body: buffer,
		ContentLength: buffer.length,
		ContentType: mime.lookup(filename)
	};

	var ossClient = OSSClient();
	ossClient.useBucket(settings.bucket);
	ossClient.put(params.Key, buffer).then(function(result) {
		var host = "https://" + params.Bucket +"."+ settings.region + ".aliyuncs.com";
		var url = result.url;
		if (settings.host && 0 < settings.host.length) {
			host = settings.host;
			// host must start with http or https
			if (!host.startsWith("http")) {
				host = "http://" + host;
			}
			url = host + "/" + params.Key
		}
		callback(null, {
			name: filename,
			url: url
		});
	}, function(err) {
		return callback(makeError(err));
	})
}

var admin = plugin.admin = {};

admin.menu = function (custom_header, callback) {
	custom_header.plugins.push({
		"route": "/plugins/ali-oss",
		"icon": "fa-envelope-o",
		"name": "Aliyun OSS"
	});

	callback(null, custom_header);
};

module.exports = plugin;
