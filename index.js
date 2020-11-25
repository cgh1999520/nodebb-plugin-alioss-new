let Package = require("./package.json");

let OSS = require('ali-oss'),
    mime = require("mime"),
    uuid = require("uuid").v4,
    fs = require("fs"),
    Config = require("./../../config.json"),
    request = require("request"),
    gm = require("gm"),
    im = gm.subClass({imageMagick: true}),
    meta = require.main.require("./src/meta"),
    winston = require.main.require("winston"),
    db = require.main.require("./src/database");

let plugin = {}

"use strict";

let client = null;
let settings = {
    "accessKeyId": false,
    "secretAccessKey": false,
    "region": "", // 节点区域
    "bucket": "", // 节点名称
    "host": "", // 访问地址
    "path": "" // 保存路径
};

function fetchSettings(callback) {
    db.getObjectFields(Package.name, Object.keys(settings), function (err, newSettings) {
        if (err) {
            winston.error(err.message);
            if (typeof callback === "function") {
                callback(err);
            }
            return;
        }
        try {

            // 阿里OSS 配置， 从 config.json 获取, 无法获取，则从系统环境变量获取
            let aliOssConfig = Config.aliOssConfig
            let processEnv = process.env

            if (!newSettings.accessKeyId) {
                settings.accessKeyId =(aliOssConfig
                    ? aliOssConfig.OSS_ACCESS_KEY_ID
                    : processEnv.OSS_ACCESS_KEY_ID) || false;
            }else {
                settings.accessKeyId = newSettings.accessKeyId || false;
            }
            if (!newSettings.secretAccessKey) {
                settings.secretAccessKey =(aliOssConfig
                    ? aliOssConfig.OSS_SECRET_ACCESS_KEY
                    : processEnv.OSS_SECRET_ACCESS_KEY) || false;
            }else {
                settings.secretAccessKey = newSettings.secretAccessKey || false;
            }
            if (!newSettings.bucket) {
                settings.bucket = (aliOssConfig
                    ? aliOssConfig.OSS_UPLOADS_BUCKET
                    : processEnv.OSS_UPLOADS_BUCKET) || "";
            } else {
                settings.bucket = newSettings.bucket;
            }
            if (!newSettings.host) {
                settings.host = (aliOssConfig
                    ? aliOssConfig.OSS_UPLOADS_HOST
                    : processEnv.OSS_UPLOADS_HOST) || "";
            } else {
                settings.host = newSettings.host;
            }
            if (!newSettings.path) {
                settings.path = (aliOssConfig
                    ? aliOssConfig.OSS_UPLOADS_PATH
                    : processEnv.OSS_UPLOADS_PATH) || "";
            } else {
                settings.path = newSettings.path;
            }
            if (!newSettings.region) {
                settings.region = (aliOssConfig
                    ? aliOssConfig.OSS_DEFAULT_REGION
                    : processEnv.OSS_DEFAULT_REGION) || "";
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
        }catch (e) {
            winston.error(e);
            if (typeof callback === "function") {
                callback(e);
            }
            return;
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
        let adminRoute = "/admin/plugins/ali-oss";
        params.router.get(adminRoute, params.middleware.applyCSRF, params.middleware.admin.buildHeader, renderAdmin);
        params.router.get("/api" + adminRoute, params.middleware.applyCSRF, renderAdmin);
        params.router.post("/api" + adminRoute + "/osssettings", OSSsettings);
        params.router.post("/api" + adminRoute + "/credentials", credentials);
        callback();
    });
};

function renderAdmin(req, res) {
    // Regenerate csrf token
    let token = req.csrfToken();

    let forumPath = "";
    if (Config.url) {
        forumPath = forumPath + String(Config.url);
    }
    if (forumPath.split("").reverse()[0] != "/") {
        forumPath = forumPath + "/";
    }
    let data = {
        bucket: settings.bucket,
        host: settings.host,
        path: settings.path,
        forumPath: forumPath,
        region: settings.region,
        accessKeyId: settings.accessKeyId || "",
        secretAccessKey: settings.secretAccessKey || "",
        csrf: token
    };

    res.render("admin/plugins/ali-oss", data);
}

function OSSsettings(req, res, next) {
    let data = req.body;
    let newSettings = {
        bucket: data.bucket || "",
        host: data.host || "",
        path: data.path || "",
        region: data.region || ""
    };

    saveSettings(newSettings, res, next);
}

function credentials(req, res, next) {
    let data = req.body;
    let newSettings = {
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
    let image = data.image;

    if (!image) {
        winston.error("invalid image");
        return callback(new Error("invalid image"));
    }

    //check filesize vs. settings
    if (image.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
        winston.error("error:file-too-big, " + meta.config.maximumFileSize);
        return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
    }
    let type = image.url ? "url" : "file";
    if (type === "file") {
        if (!image.path) {
            return callback(new Error("invalid image path"));
        }
        fs.readFile(image.path, function (err, buffer) {
            uploadToOSS(image.name, err, buffer, callback);
        });
    } else {
        let filename = image.url.split("/").pop();
        let imageDimension = parseInt(meta.config.profileImageDimension, 10) || 128;
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
                let buf = new Buffer(0);
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
    let file = data.file;
    if (!file) {
        return callback(new Error("invalid file"));
    }
    if (!file.path) {
        return callback(new Error("invalid file path"));
    }
    //check filesize vs. settings
    if (file.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
        winston.error("error:file-too-big, " + meta.config.maximumFileSize);
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

    let ossPath;
    if (settings.path && 0 < settings.path.length) {
        ossPath = settings.path;

        if (!ossPath.match(/\/$/)) {
            // Add trailing slash
            ossPath = ossPath + "/";
        }
    } else {
        ossPath = "/";
    }

    let ossKeyPath = ossPath.replace(/^\//, ""); // OSS Key Path should not start with slash.

    let params = {
        Bucket: settings.bucket,
        ACL: "public-read",
        Key: ossKeyPath + uuid() + '_' + filename,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: mime.lookup(filename)
    };

    let ossClient = OSSClient();
    ossClient.useBucket(settings.bucket);
    ossClient.put(params.Key, buffer).then(function (result) {
        let host = "https://" + params.Bucket + "." + settings.region + ".aliyuncs.com";
        let url = result.url;
        if (settings.host && 0 < settings.host.length) {
            host = settings.host;
            // host must start with http or https
            if (!host.startsWith("https")) {
                host = "https://" + host;
            }
            url = host + "/" + params.Key
        }
        callback(null, {
            name: filename,
            url: url
        });
    }, function (err) {
        return callback(makeError(err));
    })
}

let admin = plugin.admin = {};

admin.menu = function (custom_header, callback) {
    custom_header.plugins.push({
        "route": "/plugins/ali-oss",
        "icon": "fa-envelope-o",
        "name": "Aliyun OSS"
    });

    callback(null, custom_header);
};

module.exports = plugin;
