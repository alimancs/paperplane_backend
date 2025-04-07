import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import secretAuthKeyModel from '../models/secretAuthKey.js';
import speakeasy from 'speakeasy';
import userModel from '../models/user.js';

const secretpk = process.env.SECRET_PASSKEY;

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
function generateOTP(salt) {
    const otp = speakeasy.time({
        secret:salt,
        encoding:'base32',
        step:300,// 5 mins
        window:0
    });
    return otp;
}

// // verify OTP
function verifyOTP(otp, secretAuthKey) {
    let status  = speakeasy.time.verify( {
        secret:secretAuthKey,
        encoding:'base32',
        token:otp,
        step:300, // 5 mins
        window:0,
    })
    return status;
}

// // send OTP to recipient email
const sendOTP = async (email, otp) => {
    const emailPass = process.env.EMAIL_PASS;
    const sender = process.env.EMAIL_ADD;
    let transporter = nodemailer.createTransport({
        host:'smtp.gmail.com',
        port:587,
        secure:false,
        auth : {
            user:sender,
            pass:emailPass,
        },
    });

    const mailOptions = {
        from:`aliman2952003@outlook.com`,
        to:email,
        subject:'PAPERPLANE:Your One-time passcode',
        text: `<h1>Your email confirmation OTP is: ${otp}</h1>` 
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        const message = { success:true, info };
        return message;
    } catch(err) {
        const message = { success:false, error:err.message }
        return message;
    }
}

const register = async ( req, res ) => {
    const {
        password,
        username,
        firstname,
        lastname,
        email,
    } = req.body;
    const data = {
        password,
        username,
        firstname,
        lastname,
        email,
    }
    console.log( 'Gotten data, from user', data);

    try {
        await userModel.create( data );
        console.log('successfully created user account');
        res.status(200).json( { success:true, message:`user account created`});
    } catch (err) {
        console.log('Error creating account')
        res.status(500).json( { success:false, message:`Something went wrong: ${err.message}` } );
    }
}

const genOtpAndEmail = async ( req, res ) => {
    // res.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { email } = req.body;
    let key;
    
    try {
        // check if account with the same email already exists
        const doesEmailExist = await userModel.findOne( { email:email } );
        if ( doesEmailExist ) {
            res.status(200).json( { success:false, msg:'Account with this email already exists'})
        }

        //check for savedAuthKey
        const savedSecretAuthKey = await secretAuthKeyModel.findOne( { email:email });
        if ( !savedSecretAuthKey ) {
            key = speakeasy.generateSecret({length:20}).base32; 
            await secretAuthKeyModel.create( { key:key, email:email });
            console.log('created a secret key and saved it to database');
        } else {
            key = savedSecretAuthKey.key;
            console.log('used already saved secret key that is attributed to the recipient email');
        }
        const otpToken = generateOTP(key);

        // send otp to email
        const sendOtpToEmail = await sendOTP(email, otpToken);
        console.log(`sent an otp email to: ${email}`);

        if ( sendOtpToEmail.success ) {
            res.status(200).json( { success:true, msg:'OTP gen success', sendOtpToEmail });
        } else {
            res.status(500).json( { success:false, msg:'OTP gen failed', sendOtpToEmail });
        } 
    } catch (err) {
        res.status(500).json( { success:false, error:err.message, msg:'error occurred' } );
    }

}

const verifyOTPToken = async ( req, res ) => {
    // res.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    try {
        const { email, otpToken } = req.body;
        const savedSecretAuthKey = await secretAuthKeyModel.findOne( { email:email } );
        const secretAuthKey = savedSecretAuthKey.key;
        console.log(`secretAuthKey: ${secretAuthKey}, to verify: ${email}`);
        const isVerified = verifyOTP(otpToken, secretAuthKey);

        const msg = isVerified? 'OTP verified':'OTP invalid';
        res.status(200).json({ success:true, isVerified, msg });
    } catch(err) {
        console.log(`error verify OTP: ${err.message}`);
        res.status(400).json({ success:false, message:`error verify OTP: ${err.message}`})
    }
}

const authController = { register, genOtpAndEmail, verifyOTPToken };
export default authController;