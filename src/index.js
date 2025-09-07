require('dotenv').config();
require('express-async-errors');

const express = require('express');
const app = express();
const path = require('path')
//packages
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');


const PORT = process.env.PORT || 3000;
const connectDB = require('./database/connect');

// router
const authRouter = require('./routes/authRoute')
const userRouter = require('./routes/userRoutes')
const walletRouter = require('./routes/walletRoutes')

//middleware
const errorHandlerMiddleware = require('./middleware/error-handler');
const notFoundMiddleware = require('./middleware/notFound')
const {paystackWebhook} = require('./controllers/walletController')

app.post(
    "/api/v1/wallet/webhook",
    express.raw({ type: "application/json" }),
    paystackWebhook
  );
  
app.set('trust proxy', 1);
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
  })
);

app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());

app.use(morgan('dev'))
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET))
app.use(express.urlencoded({extended:true}));

app.use(express.static("./public"));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "wallet-api-docs2.html"));
});

app.get('/api/v1' , (req,res)=>{
    console.log(req.signedCookies)
    res.send('Wallet System')
})

app.use('/api/v1/auth' , authRouter);
app.use('/api/v1/user' , userRouter);
app.use('/api/v1/wallet' , walletRouter)

app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware);

const start = async ()=>{
    try {
        await connectDB(process.env.MONGO_URL)
        app.listen(PORT , console.log(`the app is listening on port ${PORT}...`))
    } catch (error) {
        console.log(error)
    }
}

start()