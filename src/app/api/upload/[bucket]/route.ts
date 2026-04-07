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
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
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

    // Check if Cloudinary is configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // If Cloudinary is not configured, return a placeholder URL
    if (!cloudName || !apiKey || !apiSecret || cloudName === 'SnapIdeas') {
      const placeholderUrl = `https://via.placeholder.com/800x600.jpg?text=${encodeURIComponent(file.name)}`;
      return NextResponse.json({
        url: placeholderUrl,
        publicId: `placeholder_${Date.now()}`,
        filename: file.name,
        placeholder: true,
        message: 'Cloudinary not configured. Using placeholder image.'
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folderMap: Record<string, string> = {
      'avatars': 'photo_ideas/avatars',
      'photos': 'photo_ideas/photos',
      'filters': 'photo_ideas/filters',
      'categories': 'photo_ideas/categories',
    };

    const folder = folderMap[bucket || 'photos'] || 'photo_ideas/photos';

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
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

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.name,
    });
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    
    // If Cloudinary fails, return error with details
    return NextResponse.json({ 
      error: 'Failed to upload file to Cloudinary',
      details: error.message || 'Unknown error',
      cloudinaryError: true
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

    // Skip deletion for placeholder images
    if (publicId.startsWith('placeholder_')) {
      return NextResponse.json({ message: 'Placeholder image deleted (no Cloudinary deletion needed)' });
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
