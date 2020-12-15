require('dotenv').config()

const bodyParser = require('body-parser')
const express = require('express')
const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const cors = require('cors')
const handlebars = require('express-handlebars')
const MongoClient = require('mongodb').MongoClient
// const Timestamp = require('mongodb').Timestamp
const morgan = require('morgan')
const { Timestamp } = require('mongodb')
const fs = require('fs')

// connection string
const MONGO_URL = 'mongodb://localhost:27017'

// create a client - connection pool
const mongoClient = new MongoClient(MONGO_URL, {
    useNewUrlParser: true, useUnifiedTopology: true
})

const DATABASE_NAME = 'tempapp'
const COLLECTION = 'templog'

const PORT = parseInt(process.argv[2]) ||  parseInt(process.env.PORT) || 3000

const app = express()

app.use(cors())
app.use(morgan('combined'))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
app.use(bodyParser.json({limit: '50mb'}))

const APP_PORT = process.env.APP_PORT;
const AWS_S3_HOSTNAME = process.env.AWS_S3_HOSTNAME;
const AWS_S3_ACCESSKEY_ID= process.env.AWS_S3_ACCESSKEY_ID;
const AWS_S3_SECRET_ACCESSKEY= process.env.AWS_S3_SECRET_ACCESSKEY;
const AWS_S3_BUCKET_NAME=process.env.AWS_S3_BUCKET_NAME;



// const mkTemperature = (params, imageUrl) => {
//     return {
        
//         user: params.userName,
//         q1: !!params.q1,
//         q2: params.q2,
//         ts: new Timestamp(),
//         temperature: params.temperature,
//         image: imageUrl
//     }
// }
const mkTemperature = (params, imageUrl) => {
    return {
        
        user: params.userName,
        q1: !!params.q1,
        q2: params.q2,
        ts: new Timestamp(),
        temperature: params.temperature,
        image: imageUrl
    }
}

const spacesEndpoint = new aws.Endpoint(AWS_S3_HOSTNAME)
const s3 = new aws.S3({
    endpoint: spacesEndpoint,
    accessKeyId: AWS_S3_ACCESSKEY_ID,
    secretAccessKey: AWS_S3_SECRET_ACCESSKEY
})

const upload = multer({
    dest: process.env.TMP_DIR || __dirname + '/temp',
    storage: multerS3({
        s3: s3,
        bucket: AWS_S3_BUCKET_NAME,
        acl: 'public-read',
    }),
    key: function (request, file, cb) {
        console.log(file)
        cb(null, file.originalname)
    }
})



// app.post('/temperature', express.json(), async (req, res) => {I
app.post('/temperature', upload.single('temp-img'), async (req, res) => {
    
    res.on('finish', () => {
        // delete temp file
        // ERROR
        // fs.unlink(req.file.path, () => {})
        console.log('response ended')
    })

    // console.log('req.body:', req.body)
    console.log('req.file:', req.file)
    console.log(res.req.file.location)
    

    const docs = mkTemperature(req.body, req.file.key)
    const result = await mongoClient.db(DATABASE_NAME)
    .collection(COLLECTION)
    .insertOne(docs)
    .then(result => {
        console.log('insert results: ', result)
        res.status(200)
        res.type('application/json')
        res.json({})
    }).catch(error => {
        console.error('insert error: ', error)
        res.status(500)
        res.json({error})
    })
})

// {
//     ts: Timestamp(),
//     username: "burnham",
//     q1: "no",
//     q1: "no",
//     temperature: 37.9
// }

const p0 = new Promise(
    (resolve, reject) => {
        if ((!!process.env.AWS_S3_ACCESSKEY_ID) && (!!process.env.AWS_S3_SECRET_ACCESSKEY))
            resolve()
        else
            reject('S3 keys not found')
    }
)
const p1 = mongoClient.connect()

Promise.all([[p0, p1]])
.then(() => {
    app.listen(APP_PORT, (req, res) => {
        console.log(`Application started on port ${PORT} at ${new Date()}`)
    })
})
.catch(e => {
    console.error('Cannot connect to mongoDB: ', e)
})

// mongoClient.connect()
//     .then(() => {
//         app.listen(APP_PORT, (req, res) => {
//             console.log(`Application started on port ${PORT} at ${new Date()}`)
//         })
//     })
//     .catch(e => {
//         console.error('Cannot connect to mongoDB: ', e)
//     })