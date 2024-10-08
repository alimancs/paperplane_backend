const mongoose = require("mongoose");
const { Schema, model } = mongoose;


const userSchema = new Schema({
    username:{type:String, reguired:true, unique:true, min:4},
    password:{type:String, required:true},
    followers:{type:Number},
    following:{type:Number},
    },
    {
        timestamps:true,
    }
);

const userModel = model('user', userSchema);

module.exports = userModel;