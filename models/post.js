import mongoose from "mongoose";
const { Schema, model } = mongoose;

const postSchema = new Schema({
    title : String,
    summary : String,
    content : String,
    cover : String,
    likes : Array,
    comments: Array,
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

export default postModel;