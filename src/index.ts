import * as dotenv from "dotenv";
import express from "express";
import { Client } from "minio";
import Multer from "multer";

dotenv.config({ path: __dirname + '/../.env' });

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use('/usvc/healthcheck', require('express-healthcheck')());

const multer = Multer({ storage: Multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1 /*1mb*/ } }).single("file");
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    port: (process.env.MINIO_PORT) ? parseInt(process.env.MINIO_PORT, 10) : 8080,
    useSSL: (process.env.MINIO_SECURE === 'true'),
    accessKey: process.env.MINIO_ACCESSKEY!,
    secretKey: process.env.MINIO_SECRETKEY!
});

app.post("/usvc/upload", multer, function (req, res) {
    if (req.file /*&& req.body.uid*/) {
        minioClient.putObject(process.env.MINIO_BUCKET!, req.file.originalname, req.file.buffer, function (error, etag) {
            if (error) {
                console.log(error);
                res.status(500);
                res.send(error);
                res.end();
            }

            res.status(200);
            res.send({
                msg: "Successfully uploaded file!",
                eTag: etag.etag
            });
            res.end();
            console.log(`[Upload] Uploaded new file with name: '${req.file?.originalname}' and size: ${req.file?.size}`);
        })
    } else {
        res.status(400);
        res.send(`Request parameter mismatch.`);
        res.end();
    }
});


minioClient.bucketExists(process.env.MINIO_BUCKET!, function (error: any, exists: boolean) {
    if (error) {
        return console.log(error);
    }

    if (exists) {
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    } else {
        return console.log(`Bucket "${process.env.MINIO_BUCKET}" doesn't exist! Please change the configuration or create the bucket.`);
    }
});
