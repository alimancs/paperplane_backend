import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_KEY, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log( 'Connected to mongoDB database');
    } catch(err) {
        console.log('Error connecting to database', err.message );
        process.exit(1);
    }
}

export default connectDB;