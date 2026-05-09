import mongoose from "mongoose"

export const  connectDb = async ()=>{

    try{
      await mongoose.connect(`${process.env.DB_URI}`)
      console.log("database connection succeeded");
    }
    catch(err:any){
        console.error(`mongoose connection error: ${err}`)
        process.exit(1)
    }
}