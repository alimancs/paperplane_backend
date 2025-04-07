import mongoose from "mongoose";

const followSchema = new mongoose.Schema( {
    followerId: { type:mongoose.Types.ObjectId, ref:'user', required:true },
    followingId: { type:mongoose.Types.ObjectId, ref:'user', required:true },
    },
    {
        timestamps:true
    }
);

const followModel = mongoose.models.follow || mongoose.model('user', followSchema);

export default followModel;