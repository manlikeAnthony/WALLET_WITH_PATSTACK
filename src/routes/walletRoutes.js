const express = require('express');
const router = express.Router();
const {authenticateUser} = require('../middleware/authMiddleware')
const {
    fundWallet,
    paystackCallback,
    checkBalance
} = require('../controllers/walletController')

router.post('/fundWallet' ,authenticateUser , fundWallet )
router.get("/paystack/callback", paystackCallback);

router.get('/check-balance' , authenticateUser , checkBalance)

router.get('/success' , (req,res)=>{
    res.send('<h1>You were successful in paying</h1>')
})
router.get('/cancel' , (req,res)=>{
    res.send('<h1>You were not successful in paying</h1>')
})

module.exports = router