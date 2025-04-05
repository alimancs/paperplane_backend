import mongoose from "mongoose";

const secretAuthKeySchema = new mongoose.Schema( {
    key:{ type:String, required:true },
    email:{ type:String, required:true },
    }, {
        timestamps:true,
    }
)

const secretAuthKeyModel = mongoose.models.secretAuthKey || mongoose.model('secretAuthKey', secretAuthKeySchema);

export default secretAuthKeyModel;