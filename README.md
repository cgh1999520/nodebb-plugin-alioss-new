# NodeBB 上传阿里oss 插件 
## NodeBB Aliyun OSS Plugin

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new?ref=badge_shield)

这个插件源是(This plugin is a fork of) [nodebb-plugin-ali-oss](https://github.com/ziofat/nodebb-plugin-ali-oss).
 
`npm install nodebb-plugin-alioss-new or yarn add nodebb-plugin-alioss-new`

| Plugin Version | Dependency     | Version Requirement     |
| ---------------| -------------- |:-----------------------:|
| 1.0.1          | NodeBB         | >= 1.5.* |

一个用于NodeBB的插件，用于上传文件并将其存储在S3上，它使用NodeBB中的`filter：uploadImage`钩子。 
(A plugin for NodeBB to take file uploads and store them on S3, uses the `filter:uploadImage` hook in NodeBB. )

## Aliyun OSS Configuration

您可以通过以下组合配置此插件，例如，您可以使用**环境变量**。您可以通过NodeBB Admin面板进行配置，您可以通过 config.json 配置，即使它可能打乱 nodebb config.json的规则，但它是最便利的一种方式，完整的加载顺序为：
(You can configure this plugin with the following combinations, for example, you can use **environment variables**. You can configure it through the NodeBB Admin panel, and you can configure it through config.json. Even though it may disrupt the rules of nodebb config.json, it is the most convenient way. The complete loading sequence is:)

1. 数据库 - Database
3. 基本配置文件 - Config.json
2. 系统环境变量 - Environment Variables

例如，对于[talk.kano.me]（http://talk.kano.me），我们将存储桶名称存储在环境变量中，并使用安全令牌服务自动发现凭据。 （
For instance, for [talk.kano.me](http://talk.kano.me), we store the Bucket name in an Environment Variable, and the Credentials are discovered automatically with the Security Token Service.
）
### Environment Variables

```
export OSS_ACCESS_KEY_ID="myaliyunkey"
export OSS_SECRET_ACCESS_KEY="myaliyunsecret"
export OSS_DEFAULT_REGION="oss-cn-hangzhou"
export OSS_UPLOADS_BUCKET="mybucket"
export OSS_UPLOADS_HOST="host"
export OSS_UPLOADS_PATH="path"
```

**NOTE**资产宿主是可选的-如果您未指定资产宿主，则默认资产宿主为`<bucket>。<endpoint> .aliyuncs.com`。 **NOTE**资产路径是可选的-如果您未指定资产路径，则默认资产路径为`/`。

**NOTE:** Asset host is optional - If you do not specify an asset host, then the default asset host is `<bucket>.<endpoint>.aliyuncs.com`.
**NOTE:** Asset path is optional - If you do not specify an asset path, then the default asset path is `/`.

### Config.js Variables Init
```
{
   ...
    aliOssConfig:{
              OSS_ACCESS_KEY_ID:"myaliyunkey",
              OSS_SECRET_ACCESS_KEY:"myaliyunsecret",
              OSS_DEFAULT_REGION:"oss-cn-hangzhou",
              OSS_UPLOADS_BUCKET:"mybucket",
              OSS_UPLOADS_HOST:"host",
              OSS_UPLOADS_PATH:"path"
       }
}
```
 **提示（NOTE）:** 你只需要把以上代码添加至config.json 末尾后重启nodebb 服务，不需要操作太多，这可能会打乱 nodebb 配置的规则，但这绝对操作最便捷的。
  (You only need to add the above code to the end of config.json and restart the nodebb service. There is no need to do too much. This may disrupt the rules of nodebb configuration, but it is definitely the most convenient operation.)
 
### Database Backed Variables

From the NodeBB Admin panel, you can configure the following settings to be stored in the Database:

* `bucket` — The S3 bucket to upload into
* `host` - The base URL for the asset.  **Typcially http://\<bucket\>.\<endpoint\>.aliyuncs.com**
* `Region` - The endpoint of the OSS. **like oss-cn-hangzhou**
* `path` - The asset path (optional)
* `accessKeyId` — The OSS Access Key Id
* `secretAccessKey` — The OSS Secret Access Key

**注意：将OSS凭证存储在数据库中是不明智的做法，您实际上不应该这样做。**
**NOTE: Storing your OSS Credentials in the database is bad practice, and you really shouldn't do it.**

## Contributing
Feel free to fork and pull request.

## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new?ref=badge_large)