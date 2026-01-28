import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// R2 S3-compatible configuration
const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT, // https://<account_id>.r2.cloudflarestorage.com
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;

export { s3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
