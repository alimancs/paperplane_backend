const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userm = require('./models/user');
const postm = require('./models/post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleWare = multer( { dest : 'uploads/' });
const fs = require("fs");
const { error } = require("console");

const secretpk = "jvdsygueduysdknrtetykgdej";
const salt = bcrypt.genSaltSync(10);

mongoose.connect("mongodb+srv://aerlee:h28gUA4SQfMzboiY@cluster0.dqfv1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
.then(()=> {
    console.log('connected to Mongo Database');
})
.catch( err => {
    console.error(err);
})

const app = express();

app.use(cors( { 
    credentials:true,
    origin:[ 'https://paperplane-blog.onrender.com', 'http://localhost:3000' ]}));
app.use(express.json());
app.use(cookieParser());

// server static files 
app.use( '/uploads', express.static( __dirname + '/uploads' ));

// handle user registration
app.post('/register',async (request, response)=>{
    const { username, password } = request.body;
    const userDoc = await userm.create(
         { username,
           password:bcrypt.hashSync( password, salt ),
         } );
    response.json(userDoc);
})


// functions 
function verifyToken(token) {
    try {
      jwt.verify(token, secretpk, ( error, decodedData) => {
        if ( error ) throw error;
        return decodedData;
      });
    } catch (error) {
      return null; // Token is invalid or expired
    }
  }

function cookieStrToObj(cookieStr) {
    const cookieArr = cookieStr.split(';');
    const cookieObj = {};
    for (let cookie of cookieArr) {
        if (cookie.includes('=')) {
           const [key, value] = cookie.trim().split('=');
           cookieObj[key] = value;
        } else {
            const key = cookie;
            const value = cookie;
            cookieObj[key] = value;
        }
    }
    return cookieObj;
}



// handle login
app.post('/login', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    const { username, password } = request.body;
    const userDoc = await userm.findOne( { username } );
    if (!userDoc) {
        response.status(400).json("invalid username or password"); 
    } else {

        const passOk = bcrypt.compareSync( password, userDoc.password );
    
        if (passOk) {
           const token =  jwt.sign( { 
                username,
                id:userDoc._id
                }, secretpk,
                { expiresIn : '10h'})
        response.json( { authToken: token,
                          message: 'login successful',
                           userData: { username, id: userDoc._id },
                        } );

        } else {
            response.status(400).json("invalid username or password");
        }
    }
    
})

// handle token verification 
app.get( '/profile', (request, response ) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    const token = request.headers.authorization;
    let data;
    jwt.verify( token, secretpk, {}, (error, decodedData) => {
        if ( error ) {
            data = null;
        } else {
            data = decodedData;
        }
    });
    response.json( data );
})

// handle logging out
// app.post( '/logout', (request, response) => {
//     response.cookie('token', '').json(" user logged out");
// })

// handles adding of posts
app.post( '/addpost', uploadMiddleWare.single('file'), async (request, response) => {
    const { title, summary, content } = request.body;

    const { originalname, path } = request.file;
    const parts = originalname.split('.');
    const  extension = parts[1];
    const newPath = path+'.'+extension;
    const token = request.headers.authorization;

    fs.renameSync( path, newPath );
    
    jwt.verify( token, secretpk, {}, async (error, userInfo ) => {
        const id = userInfo.id;

        const postDoc = await postm.create({
            title, 
            summary, 
            content, 
            cover : newPath,
            user : id,
          })

        response.json(postDoc);
    });
    
})

// handles displaying post on homepage
app.get( '/posts', async ( request, response ) => {
   const posts = await  postm.find().populate("user", [ 'username' ]);
   const postReverse = posts.reverse();
   response.json(postReverse);
})

// handles page view 
app.get( '/post/:id', async ( request, response) => {
    const { id } = request.params;
    const postData = await postm.findById(id).populate( 'user', [ 'username' ]);
    response.json(postData);
})

// handles post edit 
app.put('/post', uploadMiddleWare.single('file'), async ( request, response) => {
    const { title, summary, content, id } = request.body;
    let newPath = null;

    // include file extension to the path
    if (request.file) {
        const { originalname, path } = request.file;
        const parts = originalname.split('.');
        const  extension = parts[1];
        newPath = path+'.'+extension;
        fs.renameSync( path, newPath);
    }

    const token = request.headers.authorization;

    jwt.verify( token, secretpk, {}, async ( error, author ) => {
        if (error) throw error;
        const postDoc = await postm.findById(id);
        const isAuthor = JSON.stringify(postDoc.user) === JSON.stringify(author.id);
        if (isAuthor) {
            postDoc.title = title;
            postDoc.summary = summary;
            postDoc.content = content;
            postDoc.cover = newPath ? newPath : postDoc.cover;

            await postDoc.save();
            response.json(postDoc);
        } else {
            response.status(400).json('you are not the Author');
        }
    })
})

app.delete('/editpost/delete/:id', async (request, response) => {
   const { id } = request.params;
   const token = request.headers.authorization;
   const postDoc = await postm.findById(id);

    jwt.verify( token, secretpk, {}, async ( error, author ) => {
        if (error) throw error;

        const isAuthor = JSON.stringify(postDoc.user) === JSON.stringify(author.id);

        if (isAuthor) {
            postDoc.deleteOne()

            const deletePost = await postm.findByIdAndDelete(id);

            if (!deletePost) {
                response.status(400).json('something went wrong');
               }
               response.json('post deleted successfully');

        } else {
            response.status(400).json('you are not the Author');
        }
    })

})

app.listen(5000);




//h28gUA4SQfMzboiY  aerlee
//mongodb+srv://aerlee:h28gUA4SQfMzboiY@cluster0.dqfv1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0