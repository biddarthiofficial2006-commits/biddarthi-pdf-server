const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async function (event) {
  const file = event.queryStringParameters && event.queryStringParameters.file;
  if (!file) {
    return { statusCode: 400, body: 'Missing "file" query parameter' };
  }

  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION } = process.env;
  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT || !B2_REGION) {
    console.error('Missing B2 environment variables');
    return { statusCode: 500, body: 'Server misconfigured (B2 env vars missing)' };
  }

  try {
    const s3 = new S3Client({
      endpoint: B2_ENDPOINT,
      region: B2_REGION,
      credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY,
      },
      forcePathStyle: true,
    });

    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: file,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 302,
      headers: {
        Location: signedUrl,
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  } catch (err) {
    console.error('B2 signed URL generation failed', err);
    return { statusCode: 404, body: 'File not found or B2 error' };
  }
};
