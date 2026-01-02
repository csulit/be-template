import { env } from "../env.js";

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageProvider {
  upload(options: UploadOptions): Promise<string>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Local storage provider for development
 * Replace with S3 or R2 in production
 */
class LocalStorageProvider implements StorageProvider {
  async upload(options: UploadOptions): Promise<string> {
    // In development, just return a mock URL
    console.log("File uploaded (local provider):");
    console.log(`  Key: ${options.key}`);
    console.log(`  Size: ${options.body.length} bytes`);
    console.log(`  Type: ${options.contentType}`);

    return `http://localhost:${env.PORT}/uploads/${options.key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    console.log(`Signed URL generated for: ${key} (expires in ${expiresIn}s)`);
    return `http://localhost:${env.PORT}/uploads/${key}?expires=${Date.now() + expiresIn * 1000}`;
  }

  async delete(key: string): Promise<void> {
    console.log(`File deleted: ${key}`);
  }
}

/**
 * S3 storage provider stub
 * Implement when AWS credentials are configured
 */
class S3StorageProvider implements StorageProvider {
  async upload(_options: UploadOptions): Promise<string> {
    // TODO: Implement S3
    // const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    //
    // const client = new S3Client({
    //   region: env.AWS_REGION,
    //   credentials: {
    //     accessKeyId: env.AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    //   },
    // });
    //
    // const bucket = "your-bucket-name";
    // await client.send(new PutObjectCommand({
    //   Bucket: bucket,
    //   Key: _options.key,
    //   Body: _options.body,
    //   ContentType: _options.contentType,
    // }));
    //
    // return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${_options.key}`;

    throw new Error("S3 storage provider not implemented");
  }

  async getSignedUrl(_key: string, _expiresIn = 3600): Promise<string> {
    // TODO: Implement signed URL generation
    throw new Error("S3 storage provider not implemented");
  }

  async delete(_key: string): Promise<void> {
    // TODO: Implement deletion
    throw new Error("S3 storage provider not implemented");
  }
}

// Export provider based on environment
export const storageProvider: StorageProvider =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? new S3StorageProvider()
    : new LocalStorageProvider();
