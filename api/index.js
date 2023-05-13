const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User')
const Post = require('./models/Post')
const cookieParser = require('cookie-parser')
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs')

const salt = bcrypt.genSaltSync(8);
const secret = "asdfe45we45w345wegw"

const app = express();
app.use(cors({credentials: true, origin: "http://localhost:3000"}))
app.use(cookieParser())
app.use(express.json())
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect("mongodb+srv://blog:LbfQ8XchDpUO2oPc@cluster0.zafixsd.mongodb.net/?retryWrites=true&w=majority")

app.post('/register', async (req, res) => {
    const {username, password} = req.body
    try {
        const userDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password, salt),
        })
        res.json(userDoc)
    } catch (e) {
        res.status(400).json(e)
    }
})

app.post('/login', async (req, res) => {
    const {username, password} = req.body
    const userDoc = await User.findOne({username})
    const passOK = bcrypt.compareSync(password, userDoc.password)
    if (passOK) {
        // user logged in
        jwt.sign({username, id:userDoc._id}, secret, {}, (err,token) => {
            if (err) throw err;
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            })
        })
    } else {
        // not logged in
        res.status(400).json('Wrong credentials')
    }
})

app.get('/profile', (req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
      if (err) throw err;
      res.json(info);
    })
})

app.post('/logout', (req, res) => {
    res.cookie(token, '').json('ok')
})

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const {originalname, path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const {title, summary, content} = req.body;
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover:newPath,
            author: info.id,
        })
        res.json(postDoc)
    })
})


app.get('/post', async (req, res) => {
    const posts = await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(28)
    res.json(posts)
})

app.get('/post/:id', async (req, res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
})

app.listen(4000)

// FIX NOT WIRINT USER CORRCET USERNMAE CAUSES CRASHES
// FIX TOKEN CANNOT BE EMPTY THAT IS IT IS NOT DEFINED
