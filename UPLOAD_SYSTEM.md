# Local Image Upload System

## Overview
This system handles image uploads locally to the `backend/uploads/` folder, organized by month (YYYY/MM structure).

## Folder Structure
```
backend/
  uploads/
    2024/
      01/  (January 2024)
      02/  (February 2024)
      03/  (March 2024)
      ...
```

## API Endpoints

All endpoints require **Admin authentication** (`isAuth` + `isAdmin` middleware).

### 1. Upload Single Image
**POST** `/api/upload/image`

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `image`
- Max file size: 10MB
- Allowed types: jpeg, jpg, png, gif, webp, svg

**Response:**
```json
{
  "message": "Image uploaded successfully",
  "url": "/uploads/2024/01/filename_1234567890_abc123.jpg",
  "filename": "filename_1234567890_abc123.jpg",
  "size": 123456,
  "mimetype": "image/jpeg"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5055/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

---

### 2. Upload Multiple Images
**POST** `/api/upload/images`

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `images` (array)
- Max files: 10
- Max file size per file: 10MB
- Allowed types: jpeg, jpg, png, gif, webp, svg

**Response:**
```json
{
  "message": "3 image(s) uploaded successfully",
  "files": [
    {
      "url": "/uploads/2024/01/file1_1234567890_abc123.jpg",
      "filename": "file1_1234567890_abc123.jpg",
      "size": 123456,
      "mimetype": "image/jpeg"
    },
    ...
  ],
  "count": 3
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5055/api/upload/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

---

### 3. Delete Image
**DELETE** `/api/upload/image`

**Request Body:**
```json
{
  "url": "/uploads/2024/01/filename_1234567890_abc123.jpg"
}
```

**Response:**
```json
{
  "message": "Image deleted successfully"
}
```

---

### 4. Get Uploaded Images List (Optional)
**GET** `/api/upload/images`

**Response:**
```json
{
  "images": [
    {
      "url": "/uploads/2024/01/filename.jpg",
      "filename": "filename.jpg",
      "path": "2024/01/filename.jpg",
      "size": 123456,
      "modified": "2024-01-15T10:30:00.000Z"
    },
    ...
  ],
  "count": 10
}
```

---

## Accessing Uploaded Images

Uploaded images are served statically at:
```
http://localhost:5055/uploads/YYYY/MM/filename.jpg
```

Example:
```
http://localhost:5055/uploads/2024/01/product_image_1234567890_abc123.jpg
```

---

## Frontend Integration

### Using FormData (JavaScript/React)

```javascript
// Single image upload
const uploadImage = async (file, token) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('http://localhost:5055/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.url; // Use this URL in your database
};

// Multiple images upload
const uploadImages = async (files, token) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await fetch('http://localhost:5055/api/upload/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.files.map(f => f.url); // Array of URLs
};
```

---

## Features

✅ **Monthly Organization**: Images automatically organized by year/month  
✅ **Unique Filenames**: Prevents conflicts with timestamp + random string  
✅ **File Validation**: Only images allowed, max 10MB  
✅ **Admin Only**: All upload endpoints require admin authentication  
✅ **Static Serving**: Images served directly via Express static middleware  
✅ **File Deletion**: Can delete uploaded images via API  

---

## Notes

- The `uploads/` folder is in `.gitignore` (not committed to git)
- Monthly folders are created automatically when first image is uploaded
- Filenames are sanitized (special characters replaced with underscores)
- Original filenames are preserved in the generated filename (first 50 chars)

