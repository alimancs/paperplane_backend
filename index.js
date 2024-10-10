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
require('dotenv').config();

const secretpk = process.env.SECRET_PASSKEY;
const salt = bcrypt.genSaltSync(10);

mongoose.connect(process.env.DATABASE_KEY)
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
           followers:0,
           following:0,
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
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
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

    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
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
app.post( '/addpost', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { title, summary, content, cover } = request.body;
    console.log(request.body)

    const token = request.headers.authorization;
    
    jwt.verify( token, secretpk, {}, async (error, userInfo ) => {
        const id = userInfo.id;

        const postDoc = await postm.create({
            title, 
            summary, 
            content, 
            cover,
            user : id,
            likes:0,
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
app.put('/post/:id', async ( request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { title, summary, content, cover } = request.body;
    const { id } = request.params;

    const token = request.headers.authorization;

    jwt.verify( token, secretpk, {}, async ( error, author ) => {
        if (error) throw error;
        console.log(id);
        const postDoc = await postm.findById(id);
        console.log(postDoc);
        console.log(author);
        const isAuthor = JSON.stringify(postDoc.user) === JSON.stringify(author.id);
        if (isAuthor) {
            postDoc.title = title;
            postDoc.summary = summary;
            postDoc.content = content;
            postDoc.cover = cover ? cover : postDoc.cover;

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

// get a userpost
app.get('/profile/:username', async (request, response ) => {

    const { username } = request.params;
    const user = await userm.findOne( { username } );
    const date = user.createdAt;
    const posts = await  postm.find().populate("user", [ 'username' ]);
    const postReverse = posts.reverse();
    const userposts = [];

    postReverse.map( post => {
        if ( post.user.username === username ) {
            userposts.push(post);
        }
    });

    const data = { 
        joinDate : date,
        posts : userposts,
    };
    response.json(data);

});


app.listen(80);




