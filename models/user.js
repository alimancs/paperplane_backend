import mongoose from "mongoose";
const { Schema, model } = mongoose;


const userSchema = new Schema({
    username:{type:String, reguired:true, unique:true, min:4},
    password:{type:String, required:true},
    email:{type:String, required:true},
    firstname:{type:String},
    lastname:{type:String},
    bio:{type:String},
    profilePic:{type:String},
    followers:{type:Number},
    following:{type:Number},
    },
    {
        timestamps:true,
    }
);

const userModel = model('user', userSchema);

export default userModel;