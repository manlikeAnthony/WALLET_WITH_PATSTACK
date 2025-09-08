const crypto = require("crypto");
const CustomError = require("../errors");
const User = require("../models/user");
const Token = require("../models/Token");
const {
  attachCookiesToResponse,
  createTokenUser,
  sendVerificationEmail,
} = require("../utils");
const {
  registerValidator,
  loginValidator,
  verifyValidator,
} = require("../validator/authValidate");
const { StatusCodes } = require("http-status-codes");

const register = async (req, res) => {
  const { error, value } = registerValidator(req.body);
  
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: error.details.map((d) => d.message),
    });
  }
  const { email, name, password } = value;

  const emailAlreadyExists = await User.findOne({ email });

  if (emailAlreadyExists) {
    throw new CustomError.BadRequest("Email already exists");
  }
  // register first user as admin

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";

  const verificationToken = crypto.randomBytes(40).toString("hex");
 
  const user = await User.create({
    name,
    email,
    password,
    role,
    verificationToken,
  });
  
  const origin = "http://localhost:3000"; //incase a frontend is created make sure you match this with the name
 
  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationToken: user.verificationToken,
    origin,
  });

  res
    .status(StatusCodes.CREATED)
    .json({ msg: "check email to verify your account" });
};

const verifyEmail = async (req, res) => {
  const { verificationToken, email } = req.body;
  const { error, value } = verifyValidator(req.body);
  if (error) {
    console.log(error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: error.details.map((details) => details.message) });
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.UnauthenticatedError("invalid credentials");
  }
  if (user.verificationToken !== verificationToken) {
    throw new CustomError.UnauthenticatedError("invalid credentials");
  }
  user.isVerified = true;
  user.verified = Date.now();
  user.verificationToken = " ";
  await user.save();

  res.status(StatusCodes.OK).json({ msg: "Email successfully Verified" });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const { error, value } = loginValidator(req.body);
  if (error) {
    console.log(error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: error.details.map((details) => details.message) });
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.UnauthenticatedError("invalid credentials");
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("invalid credentials");
  }
  if (!user.isVerified) {
    throw new CustomError.UnauthenticatedError("Account not verified");
  }
  const tokenUser = createTokenUser(user);

  let refreshToken = "";
  const existingToken = await Token.findOne({ user: user._id });
  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      throw new CustomError.UnauthenticatedError("invalid credentials");
    }
    refreshToken = existingToken.refreshToken;
    attachCookiesToResponse({ res, user: tokenUser, refreshToken });
    res.status(StatusCodes.OK).json({ tokenUser });
    return;
  }
  refreshToken = crypto.randomBytes(40).toString("hex");
  const userAgent = req.headers["user-agent"];
  const ip = req.ip;
  const userToken = { refreshToken, userAgent, ip, user: user._id };
  await Token.create(userToken);
console.log("JWT_SECRET length:", process.env.JWT_SECRET?.length);

  attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const logout = async (req, res) => {
  await Token.findOneAndDelete({ user: req.user.userId });
  res.cookie("accessToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.cookie("refreshToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "user logged out" });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new CustomError.BadRequestError(
      "must provide all the required vlues"
    );
  }
  const user = await User.findOne({ email });
  if (user) {
    const passwordToken = crypto.randomBytes(70).toString("hex");
    const origin = "http://localhost:3000";

    await sendResetPasswordEmail({
      name: user.name,
      email: user.email,
      token: passwordToken,
      origin,
    });
    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);
    user.passwordToken = createHash(passwordToken);
    user.passwordTokenExpirationDate = passwordTokenExpirationDate;
    await user.save();
  }

  res
    .status(StatusCodes.OK)
    .json({ msg: "please check your email for reset password link" });
};

const resetPassword = async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    throw new CustomError.BadRequestError("provide all the values");
  }
  const user = await User.findOne({ email });
  if (user) {
    const currentDate = new Date();
    if (
      user.passwordToken === createHash(token) ||
      user.passwordTokenExpirationDate > currentDate
    ) {
      user.password = password;
      user.passwordToken = null;
      user.passwordTokenExpirationDate = null;
      await user.save();
    }
  }
  res.status(StatusCodes.OK).json({ msg: "password successfully reset" });
};
module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
