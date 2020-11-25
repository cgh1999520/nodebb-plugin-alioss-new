# NodeBB Aliyun OSS Plugin
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new?ref=badge_shield)

This plugin is a fork of [nodebb-plugin-ali-oss](https://github.com/ziofat/nodebb-plugin-ali-oss).
 
`npm install nodebb-plugin-alioss-new or yarn add nodebb-plugin-alioss-new`

| Plugin Version | Dependency     | Version Requirement     |
| ---------------| -------------- |:-----------------------:|
| 1.0.1          | NodeBB         | >= 1.5.* |

A plugin for NodeBB to take file uploads and store them on S3, uses the `filter:uploadImage` hook in NodeBB. 

## Aliyun OSS Configuration

You can configure this plugin via a combination of the below, for instance, you can use **environment variables**. You can also configure via the NodeBB Admin panel, which will result in the Bucket and Credentials being stored in the NodeBB Database.

If you decide to use the Database storage for Credentials, then they will take precedence over both Environment Variables and Instance Meta-data, the full load order is:

1. Database
3. Config.json
2. Environment Variables

For instance, for [talk.kano.me](http://talk.kano.me), we store the Bucket name in an Environment Variable, and the Credentials are discovered automatically with the Security Token Service.

### Environment Variables

```
export OSS_ACCESS_KEY_ID="myaliyunkey"
export OSS_SECRET_ACCESS_KEY="myaliyunsecret"
export OSS_DEFAULT_REGION="oss-cn-hangzhou"
export OSS_UPLOADS_BUCKET="mybucket"
export OSS_UPLOADS_HOST="host"
export OSS_UPLOADS_PATH="path"
```

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

**NOTE: Storing your OSS Credentials in the database is bad practice, and you really shouldn't do it.**

## Contributing
Feel free to fork and pull request.

## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcgh1999520%2Fnodebb-plugin-alioss-new?ref=badge_large)