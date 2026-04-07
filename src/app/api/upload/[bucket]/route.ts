import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'SnapIdeas_uploads';

    // Check if we should use unsigned upload (recommended for web)
    const useUnsigned = process.env.USE_UNSIGNED_UPLOAD === 'true';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let uploadResult;

    if (useUnsigned && uploadPreset) {
      // Unsigned upload using upload preset (no signature needed)
      uploadResult = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString('base64')}`,
        {
          upload_preset: uploadPreset,
          folder: `photo_ideas/${bucket || 'photos'}`,
          public_id: `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        }
      );
    } else {
      // Signed upload (requires valid credentials)
      const folderMap: Record<string, string> = {
        'avatars': 'photo_ideas/avatars',
        'photos': 'photo_ideas/photos',
        'filters': 'photo_ideas/filters',
        'categories': 'photo_ideas/categories',
      };

      const folder = folderMap[bucket || 'photos'] || 'photo_ideas/photos';

      uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('Upload failed'));
          }
        );

        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
      });
    }

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: file.name,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json({ error: 'Public ID is required' }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return NextResponse.json({ message: 'File deleted successfully' });
    }

    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
