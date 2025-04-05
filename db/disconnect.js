import mongoose from "mongoose";

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('disconnected from mongoDB');
    } catch(err) {
        console.log('error disconnecting from mongoDB', err.message);
    }
}

export default disconnectDB;