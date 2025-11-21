import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Ensure uploads directory exists
import fs from 'fs';
const uploadsDir = './uploads';
const knowledgeUploadsDir = './uploads/knowledge';
const knowledgeImagesDir = './uploads/knowledge-images';
const updatesUploadsDir = './uploads/updates';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(knowledgeUploadsDir)) {
  fs.mkdirSync(knowledgeUploadsDir, { recursive: true });
}
if (!fs.existsSync(knowledgeImagesDir)) {
  fs.mkdirSync(knowledgeImagesDir, { recursive: true });
}
if (!fs.existsSync(updatesUploadsDir)) {
  fs.mkdirSync(updatesUploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// File filter for validation (healthcare-appropriate file types)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow common document, image, and spreadsheet types for healthcare use
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
  }
};

// Configure upload middleware
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: fileFilter
});

// Configure knowledge article upload middleware (saves to /uploads/knowledge/)
const knowledgeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/knowledge/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

export const knowledgeUpload = multer({
  storage: knowledgeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: fileFilter
});

// Configure knowledge image upload middleware (saves to /uploads/knowledge-images/)
const knowledgeImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/knowledge-images/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// File filter for knowledge images (images only)
const knowledgeImageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only image types for inline embedding
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (PNG, JPG, JPEG, GIF) are allowed.'));
  }
};

export const knowledgeImageUpload = multer({
  storage: knowledgeImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: knowledgeImageFileFilter
});

// Configure updates upload middleware (saves to /uploads/updates/)
const updatesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/updates/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// File filter for updates (images only)
const updatesFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only image types for updates
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (PNG, JPG, JPEG, GIF) are allowed.'));
  }
};

export const updatesUpload = multer({
  storage: updatesStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: updatesFileFilter
});
