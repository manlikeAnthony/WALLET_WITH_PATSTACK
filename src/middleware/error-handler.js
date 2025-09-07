const {CustomAPIError}= require('../errors');
const {StatusCodes} = require('http-status-codes');

const errorHandlerMiddleware = async (err,req,res,next)=>{
    const customError = {
        statusCode : err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        msg : err.message || 'something went wrong please try again later'
    }
    if(err.name === 'ValidationError'){
        customError.msg = Object.values(err.errors).map((item)=> item.message).join(',')
        customError.statusCode = 400
    }
    if(err.name === 'CastError'){
        customError.msg = `no item found with id : ${values}`
        customError.statusCode = 404
    }
    if(err.code && err.code === 11000){
        customError.msg = `Duplicate Value entered for ${Object.keys(err.keyValue)} field , please choose another`
        customError.statusCode = 400
    }
    return res.status(customError.statusCode).json({msg : customError.msg})
}

module.exports = errorHandlerMiddleware