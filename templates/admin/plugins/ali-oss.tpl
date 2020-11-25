<h1><i class="fa fa-picture-o"></i> Aliyun OSS Configuration</h1>
<hr/>

<p>You can configure this plugin via a combination of the below, for instance, you can use <em>instance meta-data</em>
	and <em>environment variables</em> in combination. You can also specify values in the form below, and those will be
	stored in the database.</p>

<h3>Environment Variables</h3>
<pre><code>
export OSS_ACCESS_KEY_ID="xxxxx"
export OSS_SECRET_ACCESS_KEY="yyyyy"
export OSS_UPLOADS_BUCKET="zzzz"
export OSS_UPLOADS_HOST="host"
export OSS_UPLOADS_PATH="path"
</code></pre>

<p>
	Asset host and asset path are optional. You can leave these blank to default to the standard asset url -
	http://mybucket.&lt;endpoint&gt;.aliyuncs.com/uuid.jpg.<br/>
	Asset host can be set to a custom asset host. For example, if set to cdn.mywebsite.com then the asset url is
	http://cdn.mywebsite.com/uuid.jpg.<br/>
	Asset path can be set to a custom asset path. For example, if set to /assets, then the asset url is
	http://mybucket.&lt;endpoint&gt;.aliyuncs.com/assets/uuid.jpg.<br/>
	If both are asset host and path are set, then the url will be http://cdn.mywebsite.com/assets/uuid.jpg.
</p>

<h3>Instance meta-data</h3>
<div class="alert alert-warning">
	<p>If you need help, create an <a href="https://github.com/cgh1999520/nodebb-plugin-alioss-new">issue on
		Github</a>.</p>
</div>

<h3>Database Stored configuration:</h3>
<form id="ali-oss-bucket">
	<label for="ossbucket">Bucket</label><br/>
	<input type="text" id="ossbucket" name="bucket" value="{bucket}" title="OSS Bucket" class="form-control input-lg"
	       placeholder="OSS Bucket"><br/>

	<label for="osshost">Host</label><br/>
	<input type="text" id="osshost" name="host" value="{host}" title="OSS Host" class="form-control input-lg"
	       placeholder="website.com"><br/>

	<label for="osspath">Path</label><br/>
	<input type="text" id="osspath" name="path" value="{path}" title="OSS Path" class="form-control input-lg"
	       placeholder="/assets"><br/>

	<label for="oss-region">Region</label><br/>
    <input type="text" id="oss-region" name="region" value="{region}" title="OSS Path" class="form-control input-lg"
	       placeholder="oss-cn-hangzhou"><br/>
	<br/>

	<button class="btn btn-primary" type="submit">Save</button>
</form>

<br><br>
<form id="ali-oss-credentials">
	<label for="bucket">Credentials</label><br/>
	<div class="alert alert-warning">
		Configuring this plugin using the fields below is <strong>NOT recommended</strong>, as it can be a potential
		security issue. We highly recommend that you investigate using either <strong>Environment Variables</strong> or
		<strong>Instance Meta-data</strong>
	</div>
	<input type="text" name="accessKeyId" value="{accessKeyId}" maxlength="20" title="Access Key ID"
	       class="form-control input-lg" placeholder="Access Key ID"><br/>
	<input type="text" name="secretAccessKey" value="{secretAccessKey}" title="Secret Access Key"
	       class="form-control input-lg" placeholder="Secret Access Key"><br/>
	<button class="btn btn-primary" type="submit">Save</button>
</form>

<script>
	$(document).ready(function () {

		$('#aws-region option[value="{region}"]').prop('selected', true)

		$("#ali-oss-bucket").on("submit", function (e) {
			e.preventDefault();
			save("osssettings", this);
		});

		$("#ali-oss-credentials").on("submit", function (e) {
			e.preventDefault();
			var form = this;
			bootbox.confirm("Are you sure you wish to store your credentials for accessing OSS in the database?", function (confirm) {
				if (confirm) {
					save("credentials", form);
				}
			});
		});

		function save(type, form) {
			var data = {
				_csrf: '{csrf}' || $('#csrf_token').val()
			};

			var values = $(form).serializeArray();
			for (var i = 0, l = values.length; i < l; i++) {
				data[values[i].name] = values[i].value;
			}

			$.post('{forumPath}api/admin/plugins/ali-oss/' + type, data).done(function (response) {
				if (response) {
					ajaxify.refresh();
					app.alertSuccess(response);
				}
			}).fail(function (jqXHR, textStatus, errorThrown) {
				ajaxify.refresh();
				app.alertError(jqXHR.responseJSON ? jqXHR.responseJSON.error : 'Error saving!');
			});
		}
	});
</script>
