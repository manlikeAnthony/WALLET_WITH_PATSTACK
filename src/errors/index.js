const CustomAPIError = require('./customerror');
const BadRequest = require('./badrequest');
const NotFoundError = require('./Notfounderr');
const UnauthenticatedError = require('./authError')
const UnauthorizedError = require('./unauthorized');

module.exports ={
    CustomAPIError,
    BadRequest,
    NotFoundError,
    UnauthenticatedError,
    UnauthorizedError
}