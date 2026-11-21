const express = require("express");
const mongoose = require("mongoose");

const requestRouter = express.Router();

const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

requestRouter.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const toUserId = req.params.toUserId;
        const status = req.params.status;

        // for checking status request
        const allowedStatus = ["ignored", "interested"];

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid Status Type: " + status,
            });
        }

        // a malformed id would otherwise crash the lookup
        if (!mongoose.isValidObjectId(toUserId)) {
            return res.status(400).json({ message: "User not found!" });
        }

        // nobody can send a request to themselves
        if (fromUserId.toString() === toUserId) {
            return res.status(400).json({
                message: "You cannot send a request to yourself",
            });
        }

        // if wrong toUserId is given
        const existsToUserId = await User.findById(toUserId);
        if (!existsToUserId) {
            return res.status(400).json({
                message: "User not found!",
            });
        }

        // requests can only go to alumni (students and alumni can both send)
        if (existsToUserId.role !== "alumni") {
            return res.status(400).json({
                message: "You can only send requests to alumni",
            });
        }

        // If there is an existing connection request
        const existingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId },
            ],
        });

        if (existingConnectionRequest) {
            return res.status(400).json({
                message: "Connection request already exists!!",
            });
        }

        const connectionRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status,
        });

        const data = await connectionRequest.save();

        const message =
            status === "interested"
                ? req.user.firstName + " is interested in " + existsToUserId.firstName
                : req.user.firstName + " ignored " + existsToUserId.firstName;

        res.json({
            message,
            data,
        });
    } catch (err) {
        res.status(400).send("Error: " + err.message);
    }
});

requestRouter.post("/request/review/:status/:requestId", userAuth, async (req, res) => {
    try {
        // check to your logged in id
        const loggedInUser = req.user;

        const { status, requestId } = req.params;

        const allowedStatus = ["accepted", "rejected"];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({ message: "Status not allowed!" });
        }

        if (!mongoose.isValidObjectId(requestId)) {
            return res.status(404).json({ message: "Connection request not found!" });
        }

        // only the person who received the request can accept or reject it
        const connectionRequest = await ConnectionRequest.findOne({
            _id: requestId,
            toUserId: loggedInUser._id,
            status: "interested",
        });

        if (!connectionRequest) {
            return res.status(404).json({ message: "Connection request not found!" });
        }

        connectionRequest.status = status;

        const data = await connectionRequest.save();

        res.json({
            message: "Connection Request" + " " + status,
            data,
        });
    } catch (err) {
        res.status(400).send("Error: " + err.message);
    }
});

module.exports = requestRouter;