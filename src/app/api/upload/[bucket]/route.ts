import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
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
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // Clean filename - remove all slashes and special characters
    const cleanFileName = file.name
      .replace(/[/\\]/g, '_')  // Remove path separators
      .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace special chars
      .replace(/_+/g, '_');  // Remove duplicate underscores

    console.log('Upload attempt:', { cloudName, uploadPreset, originalName: file.name, cleanName: cleanFileName });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    let uploadResult: any;

    if (uploadPreset && uploadPreset.length > 0) {
      // Unsigned upload using upload preset
      try {
        uploadResult = await cloudinary.uploader.upload(
          `data:${mimeType};base64,${base64Data}`,
          {
            upload_preset: uploadPreset,
            folder: bucket === 'photos' ? 'SnapIdeas/Images' : `SnapIdeas/${bucket || 'Images'}`,
            public_id: cleanFileName.replace(/\.[^.]+$/, ''),  // Remove extension for public_id
            resource_type: 'auto',
            use_filename: false,
            unique_filename: true,
          }
        );
        console.log('Upload success:', uploadResult.secure_url);
      } catch (uploadError: any) {
        console.error('Unsigned upload failed:', uploadError);
        return NextResponse.json({ 
          error: 'Cloudinary upload failed',
          details: uploadError.message,
          hint: 'Check if upload preset is set to Unsigned mode'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Upload preset not configured',
        details: 'CLOUDINARY_UPLOAD_PRESET environment variable is not set'
      }, { status: 500 });
    }

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: file.name,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error.message
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
