const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const postSchema = new Schema({
    title : String,
    summary : String,
    content : String,
    cover : String,
    user : { 
        type: Schema.Types.ObjectId,
        ref:'user',
    }
},
{
    timestamps:true,
}
);

const postModel = model( 'post', postSchema);

module.exports = postModel;