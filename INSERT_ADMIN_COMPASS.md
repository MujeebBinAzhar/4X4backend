# MongoDB Compass - Insert Admin User

## 📋 Collection Name: `admins`

Mongoose automatically converts `Admin` model to `admins` collection (pluralized and lowercase).

---

## ✅ Insert Document

### Collection: `admins`
### Operation: INSERT DOCUMENT

### Document JSON:
```json
{
  "name": {
    "en": "Admin"
  },
  "email": "admin@gmail.com",
  "password": "$2a$10$s.xAxFGVgaVHzdGOMljnYukCVbaklFPpzYZl54HtnrAMT4iIdI.Xq",
  "role": "Admin",
  "status": "Active"
}
```

---

## 🔄 Update Existing Admin

If admin already exists:

### Filter:
```json
{ "email": "admin@gmail.com" }
```

### Update:
```json
{
  "$set": {
    "password": "$2a$10$s.xAxFGVgaVHzdGOMljnYukCVbaklFPpzYZl54HtnrAMT4iIdI.Xq"
  }
}
```

---

## 🔑 Login Credentials

- **Email:** `admin@gmail.com`
- **Password:** `12345678`

---

## 📝 Complete Document (with all fields)

If you want to include all optional fields:

```json
{
  "name": {
    "en": "Admin"
  },
  "email": "admin@gmail.com",
  "password": "$2a$10$s.xAxFGVgaVHzdGOMljnYukCVbaklFPpzYZl54HtnrAMT4iIdI.Xq",
  "role": "Admin",
  "status": "Active",
  "phone": "",
  "image": "",
  "address": "",
  "country": "",
  "city": "",
  "joiningData": null
}
```

---

## ✅ Steps in MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Select database (e.g., `all4x4`)
4. Click on **`admins`** collection
5. Click **"INSERT DOCUMENT"**
6. Paste the JSON above
7. Click **"INSERT"**

---

## 🧪 Test Login

After inserting, test login:
```bash
curl -X POST http://localhost:5055/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"12345678"}'
```

