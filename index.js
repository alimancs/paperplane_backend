// Dependencies --------------------------------------------------------
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userm = require('./models/user');
const postm = require('./models/post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const bodyParser = require("body-parser");
require('dotenv').config();

const secretpk = process.env.SECRET_PASSKEY;
const salt = bcrypt.genSaltSync(10);
const secretOTPkey = speakeasy.generateSecret({length:20});
const emailPass = process.env.EMAIL_PASS;
const sender = process.env.EMAIL_ADD;

mongoose.connect(process.env.DATABASE_KEY)
.then(()=> {
    console.log('connected to Mongo Database');
})
.catch( err => {
    console.error(err);
})

const app = express();
app.use(bodyParser.json({ limit:'50mb' }));
app.use(bodyParser.urlencoded( { extended: true, limit: '50mb'}));
app.use(cors( { credentials:true, origin:['https://paperplane-blog.onrender.com', 'http://localhost:3000']}));
app.use(express.json());
app.use(cookieParser());

// server static files 
// app.use( '/uploads', express.static( __dirname + '/uploads' ));


//------------------------------------------------------------------------------------------------------------

// FUNCTIONS

//very token and returns decoded data
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

// generates OTP
function generateOTP() {
    const otp = speakeasy.time({
        secret:secretOTPkey.base32,
        encoding:'base32',
        step:300,// 5 mins
        window:0
    });
    return otp;
}

// send OTP to recipient email
function sendOTP(email, otp) {
   
    let transporter = nodemailer.createTransport({
        host:'smtp.gmail.com',
        port:587,
        secure:false,
        auth : {
            user:sender,
            pass:emailPass,
        },
    });
    transporter.sendMail({
        from:`aliman2952003@outlook.com`,
        to:email,
        subject:'PAPERPLANE:Your One-time passcode',
        text: `<h1>Your email confirmation OTP is: ${otp}</h1>`
        }, (err, info)=> {
            if (err) {
                console.error(err);
                return { error: 'email not sent, something went wrong'};
            } else {
                console.log(`message: ${info.response}`);
                return ({ message :`email sent- ${info.response}`})
            }
        }
);

}

// verify OTP
function verifyOTP(otp) {
    let status  = speakeasy.time.verify( {
        secret:secretOTPkey.base32,
        encoding:'base32',
        token:otp,
        step:300, // 5 mins
        window:0,
    })
    return status;
}



//-------------------------------------------------------------------------------------------------------------

// ENDPOINTS

// handle user registration
app.post('/register',async (request, response)=>{
    const { username, password, email, firstname, lastname } = request.body;
    const userDoc = await userm.create(
         { username,
           password:bcrypt.hashSync( password, salt ),
           email,
           firstname,
           lastname,
           followers:0,
           following:0,
           profilePic:'',
           bio:'Hey, I am using Paperplane'
         } );
    response.json(userDoc);
})


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
                id:userDoc._id,
                }, secretpk,
                { expiresIn : '24h'})
        response.json( { authToken: token,
                          message: 'login successful',
                           userData: { username, id: userDoc._id},
                        } );

        } else {
            response.status(400).json("invalid username or password");
        }
    }
    
})

// handle token verification 
app.post( '/profile', async (request, response ) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const token = request.headers.authorization;
    let data; 
    let decoded_token;
 
    try {
        decoded_token = jwt.verify( token, secretpk);
        const { username } = decoded_token;
        const user = await userm.findOne( { username } );
        const dp = user.profilePic;
        data = { ...decoded_token, dp }
        response.json( data );
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
           decoded_token = null;
           response.json(decoded_token);
        }
    }
        
    });

// handle logging out
// app.post( '/logout', (request, response) => {
//     response.cookie('token', '').json(" user logged out");
// })

// handles adding of posts
app.post( '/addpost', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { title, summary, content, cover } = request.body;


    const token = request.headers.authorization;
    
    jwt.verify( token, secretpk, {}, async (error, userInfo ) => {
        const id = userInfo.id;

        const postDoc = await postm.create({
            title, 
            summary, 
            content, 
            cover,
            user : id,
            likes:[],
          })

        response.json(postDoc);
    });
    
})

// handles displaying post on homepage
app.get( '/posts', async ( request, response ) => {
   const posts = await  postm.find().populate("user", [ 'username', 'profilePic' ]);
   const postReverse = posts.reverse();
   response.json(postReverse);
})

// handles page view 
app.get( '/post/:id', async ( request, response) => {
    const { id } = request.params;
    const postData = await postm.findById(id).populate( 'user', [ 'username', 'profilePic' ]);
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
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { username } = request.params;
    const user = await userm.findOne( { username } );
    const date = user.createdAt;
    const fullname = `${user.firstname} ${user.lastname}`;
    const { profilePic, bio } = user;
    const posts = await  postm.find().populate("user", [ 'username', 'profilePic' ]);
    const postReverse = posts.reverse();
    const userposts = [];

    postReverse.map( post => {
        if ( post.user.username === username ) {
            userposts.push(post);
        }
    });

    const data = { 
        id:user._id,
        fullname,
        profilePic,
        bio,
        joinDate : date,
        posts : userposts,
    };
    response.json(data);

});

//get basic user data to the frontend
app.get('/basic-user-data/:username', async (request, response ) => {

    const { username } = request.params;
    const user = await userm.findOne( { username } );
    const { profilePic, bio, firstname, lastname } = user;

    const data = { 
        firstname,
        lastname,
        profilePic,
        bio,
    };
    response.json(data);

});

//handles creating of OTp and sending it to recipient
app.post('/send-otp', (request, response) => {
    const { email } = request.body;
    const otp = generateOTP();  
    console.log(`email address: ${email}, OTP: ${otp}`)
    try {
       const isSent = sendOTP(email, otp);
       response.json({ sent:true });
    } catch(err) {
       response.status(400).json({sent:false});
    }
})

//handles verification of OTP;

app.post('/verify-otp', (request, response) => {
    const { otp }= request.body;
    const isverified = verifyOTP(otp);
    response.json({ verification : isverified});
})

// save edits to user profile
app.put('/save-edit/:username', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { username } = request.params;
    const { firstname, lastname, profilePic, name, bio } = request.body;
    const user = await userm.findOne( { username });
    user.firstname = firstname;
    user.lastname = lastname;
    user.profilePic = profilePic;
    user.username = name;
    user.bio = bio;
    await user.save();
    response.json({ message:'edit saved'});
})

//add like to post
app.put('/like/:id',  async (request, response)=> {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const newlikes = [];
    const data = request.body;
    const { id } = request.params;
    const postDoc = await postm.findById(id);
    if (data.like) {
        postDoc.likes.push(data.liker)
    } else {
    postDoc.likes.map(user=> {
        if (user!== data.liker) {newlikes.push(user)}
    })
    postDoc.likes = newlikes;
    }
    await postDoc.save();
    response.json({message:'success'});

})

app.put('/addcomment/:id', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { commentObj } = request.body;
    const { id } = request.params;
    const postDoc = await postm.findById(id);
    commentObj.state = '';
    postDoc.comments.push(commentObj);
    await postDoc.save();
    response.json({message:'success'});
});

app.get('/comments/:id', async (request, response) => {
    // response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');

    const { id } = request.params;
    const postDoc = await postm.findById(id);
    const commentsData = postDoc.comments;
    commentsData.map( async (c) => {
    const username = c.user;
    console.log(username, c.text);
    const commenter = await userm.findOne( { username } );
    return { user:username, dp:commenter.profilePic, text:c.text, state:''};
    })

    response.json(commentsData);

})


app.listen(80);




