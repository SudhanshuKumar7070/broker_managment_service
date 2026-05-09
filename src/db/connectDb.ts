import mongoose from "mongoose"

export const  connectDb = async ()=>{

    try{
     const db_connect_res = await mongoose.connect(`${process.env.DB_URI}`)
     return db_connect_res;
    }
    catch(err:any){
        console.error(`mongoose connection error: ${err}`)
        process.exit(1)
    }
}