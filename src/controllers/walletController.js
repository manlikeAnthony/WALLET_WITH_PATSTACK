const User = require("../models/user");
const CustomError = require("../errors");
const { StatusCodes } = require("http-status-codes");
const response = require("../responses/response");
const axios = require("axios");
const CONFIG = require("../config/index");
const crypto = require("crypto");
const Transaction = require("../models/Transaction");

const fundWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const email = req.user?.email;

    // Validate input
    if (!amount || amount <= 0 || !email) {
      throw new CustomError.BadRequest(
        "You must provide a valid email and an amount greater than 0"
      );
    }

    const paystackAmount = amount * 100;

    // Initialize transaction with Paystack
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email,
        amount: paystackAmount,
        metadata: {
          userId: req.user.userId,
          amount,
        },
        callback_url: `${CONFIG.URL.BASE_URL}/api/v1/wallet/paystack/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.PAYSTACK.SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { authorization_url, reference } = paystackResponse.data.data;

    return res.status(StatusCodes.OK).json(
      response({
        status: "success",
        data: { url: authorization_url, reference: reference },
      })
    );
  } catch (error) {
    console.error(error.response?.data || error); // 👈 Logs Paystack's actual error
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      response({
        status: "error",
        message: error.response?.data || error.message,
      })
    );
  }
};

const paystackCallback = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      throw new CustomError.BadRequest("No reference supplied");
    }

    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = verifyRes.data.data;

    if (paymentData.status === "success") {
      return res.status(StatusCodes.OK).json(
        response({
          status: "success",
          message: "Payment verified successfully",
          data: paymentData,
        })
      );
    }

    return res.status(StatusCodes.BAD_REQUEST).json(
      response({
        status: "error",
        message: "Payment not successful",
      })
    );
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message,
    });
  }
};

//stripe listen --forward-to localhost:5000/api/v1/wallet/webhoo  k

const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
        const rawBody = req.body.toString("utf8");

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    // Verify signature
    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: "error",
        message: "Invalid signature",
      });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
    if (event.event === "charge.success") {
      const paymentData = event.data;

      // Check if this transaction was already processed
      const existingTransaction = await Transaction.findOne({
        reference: paymentData.reference,
      });
      if (existingTransaction) {
        return res.status(StatusCodes.OK).send("Already processed");
      }

      // Save transaction
      const transaction = await Transaction.create({
        userId: paymentData.metadata.userId,
        reference: paymentData.reference,
        amount: paymentData.amount / 100, // Convert kobo to naira
        status: paymentData.status,
        gatewayResponse: paymentData.gateway_response,
      });

      // Update user balance (increment, not overwrite)
      await User.findByIdAndUpdate(
        paymentData.metadata.userId,
        { $inc: { balance: paymentData.amount / 100 } },
        { new: true, runValidators: true }
      );
    

    return res.status(StatusCodes.OK).send("Webhook received");
    }}
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message,
    });
  }
};

const checkBalance = async (req, res) => {
  const user = await User.findOne({ _id: req.user.userId });
  res.status(StatusCodes.OK).json({ name: user.name, balance: user.balance });
};

module.exports = {
  fundWallet,
  paystackCallback,
  checkBalance,
  paystackWebhook,
};
