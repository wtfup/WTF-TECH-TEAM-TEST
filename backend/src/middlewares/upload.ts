import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    // The scale-test workbook (100k rows) is ~35 MB; a 20 MB cap rejected the
    // very file the pipeline exists to ingest. Headroom to 200 MB.
    fileSize: 200 * 1024 * 1024,
  },
});