const joi = require('joi');

const validator = (schema)=> (payload)=>{
    return schema.validate(payload , {abortEarly : false})
}

const registerValidatorSchema = joi.object({
    name : joi.string().max(50).min(3).required(),
    password: joi.string().min(6).required(),
    email: joi.string().email().required()
})

const loginValidatorSchema = joi.object({
  password: joi.string().min(6).required(),
  email: joi.string().email().required(),
});

const verifyValidatorSchema = joi.object({
  verificationToken : joi.string().required(),
  email : joi.string().email().required()
})

exports.registerValidator = validator(registerValidatorSchema)
exports.loginValidator = validator(loginValidatorSchema)
exports.verifyValidator = validator(verifyValidatorSchema)