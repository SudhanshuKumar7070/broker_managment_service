
class  customResponse{
    statusCode:number;
    data:any;
    message:string;
    success:boolean;
    constructor(
        statusCode:number,
        data:any,
        message:string = "OK",
        success:boolean = true
    ){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = success;
    }
}
 export {customResponse}