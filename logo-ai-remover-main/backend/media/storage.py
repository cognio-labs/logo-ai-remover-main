import boto3
from botocore.config import Config

from .config import get_settings


class ObjectStore:
    def __init__(self):
        self.settings = get_settings()
        s = self.settings
        self.client = boto3.client("s3", endpoint_url=s.s3_endpoint, region_name=s.s3_region,
            aws_access_key_id=s.s3_access_key.get_secret_value() or None,
            aws_secret_access_key=s.s3_secret_key.get_secret_value() or None,
            config=Config(signature_version="s3v4", connect_timeout=5, read_timeout=20,
                          retries={"max_attempts": 3, "mode": "standard"}))

    def put(self, key, body, content_type):
        args = dict(Bucket=self.settings.s3_bucket, Key=key, Body=body, ContentType=content_type,
                    CacheControl="private, no-store")
        if self.settings.s3_encryption:
            args["ServerSideEncryption"] = self.settings.s3_encryption
        if self.settings.s3_kms_key:
            args["SSEKMSKeyId"] = self.settings.s3_kms_key
        self.client.put_object(**args)

    def download(self, key, path):
        self.client.download_file(self.settings.s3_bucket, key, str(path))

    def copy(self, source, destination):
        args = dict(Bucket=self.settings.s3_bucket, Key=destination,
                    CopySource={"Bucket": self.settings.s3_bucket, "Key": source})
        if self.settings.s3_encryption:
            args["ServerSideEncryption"] = self.settings.s3_encryption
        if self.settings.s3_kms_key:
            args["SSEKMSKeyId"] = self.settings.s3_kms_key
        self.client.copy_object(**args)

    def signed_url(self, key, seconds, download=False):
        params = {"Bucket": self.settings.s3_bucket, "Key": key,
                  "ResponseCacheControl": "private, no-store"}
        if download:
            params["ResponseContentDisposition"] = 'attachment; filename="bellix-result.' + key.rsplit(".", 1)[-1] + '"'
        return self.client.generate_presigned_url("get_object", Params=params, ExpiresIn=seconds)

    def delete_job(self, job_id):
        # Objects are always addressed by server-generated UUID prefixes.
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.settings.s3_bucket, Prefix=f"jobs/{job_id}/"):
            objects = [{"Key": item["Key"]} for item in page.get("Contents", [])]
            if objects:
                result = self.client.delete_objects(Bucket=self.settings.s3_bucket, Delete={"Objects": objects})
                if result.get("Errors"):
                    raise RuntimeError("Object deletion was incomplete")
