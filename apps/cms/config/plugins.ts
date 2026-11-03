import type { Core } from '@strapi/strapi';

const allowedMediaTypes = ['image/*', 'video/*', 'application/pdf'];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

/**
 * Upload provider: S3-compatible (MinIO) when S3_BUCKET is set, local disk
 * otherwise (plain `strapi develop` without Docker). MinIO needs path-style
 * URLs (<endpoint>/<bucket>/<key>) and an explicit `baseUrl` because the
 * public host (Caddy) differs from the internal endpoint.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const useS3 = Boolean(env('S3_BUCKET'));

  const upload = useS3
    ? {
        config: {
          provider: 'aws-s3',
          providerOptions: {
            baseUrl: env('S3_PUBLIC_BASE_URL'),
            rootPath: env('S3_ROOT_PATH', ''),
            s3Options: {
              credentials: {
                accessKeyId: env('S3_ACCESS_KEY_ID'),
                secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
              },
              region: env('S3_REGION', 'us-east-1'),
              endpoint: env('S3_ENDPOINT'),
              forcePathStyle: true,
              params: {
                ACL: env('S3_ACL', 'public-read'),
                Bucket: env('S3_BUCKET'),
              },
            },
          },
          // Public bucket policy (set by infra/docker/minio-init) serves files; no signed URLs.
          actionOptions: { upload: {}, uploadStream: {}, delete: {} },
          security: { allowedTypes: allowedMediaTypes, deniedTypes },
          sizeLimit: 25 * 1024 * 1024,
        },
      }
    : {
        config: {
          security: { allowedTypes: allowedMediaTypes, deniedTypes },
          sizeLimit: 25 * 1024 * 1024,
        },
      };

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: { httpOnly: true },
      },
    },
    i18n: { enabled: true },
    upload,
  };
};

export default config;
