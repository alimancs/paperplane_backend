import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    username:{ type:String, reguired:true, unique:true, },
    password:{ type:String, required:true },
    email:{ type:String, required:true },
    firstname:{ type:String, required:true },
    lastname:{ type:String, required:true },
    bio:{ type:String },
    profilePic:{ type:String },
    },
    {
        timestamps:true,
    }
);

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;