const CustomAPIError = require('./customerror');
const {StatusCodes} = require('http-status-codes');

class UnauthorizedError extends CustomAPIError{
    constructor(message,statusCode){
        super(message)
        this.statusCode = StatusCodes.FORBIDDEN
    }
}

module.exports=UnauthorizedError;