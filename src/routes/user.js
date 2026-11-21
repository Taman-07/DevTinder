const express = require('express');
const userRouter = express.Router();
const { userAuth } = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');


// fields that are safe to send to other users (never the password or email)
const USER_SAVE_DATA = [
    "firstName",
    "lastName",
    "photoUrl",
    "age",
    "about",
    "gender",
    "skills",
    "role",
    "company",
    "jobRole",
    "branch",
    "batchYear",
    "linkedinUrl",
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


//  get all the pending connection requests for logged in User
userRouter.get("/user/requests/received",
    userAuth,
    async (req, res) => {
        try {
            const loggedInUser = req.user;

            const ConnectionRequests = await ConnectionRequest.find({
                toUserId: loggedInUser._id,
                status: "interested",
            }).populate("fromUserId", USER_SAVE_DATA);

            res.json({
                message: "Data fetched Successfully",
                data: ConnectionRequests,
            });
        }
        catch (err) {
            res.status(400).send("Error: " + err.message);
        }
    });


userRouter.get("/user/connections",
    userAuth,
    async (req, res) => {
        try {
            const loggedInUser = req.user;

            const ConnectionRequests = await ConnectionRequest.find({
                $or: [
                    { toUserId: loggedInUser._id, status: "accepted" },
                    { fromUserId: loggedInUser._id, status: "accepted" },
                ],
            }).populate("fromUserId", USER_SAVE_DATA)
              .populate("toUserId", USER_SAVE_DATA);

            const data = ConnectionRequests.map((row) => {
                if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
                    return row.toUserId;
                }
                return row.fromUserId;
            });

            res.json({ data });
        }
        catch (err) {
            res.status(400).send("Error: " + err.message);
        }
    });


// Feed: students AND alumni both see alumni cards, except
// 0. their own card
// 1. their connections
// 2. ignored people
// 3. people they already sent a request to
userRouter.get("/feed", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        // pagination (safe against page=0, negative numbers and text)
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(Math.max(limit, 1), 50);
        const skip = (page - 1) * limit;

        // everyone I already sent a request to or received one from
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedInUser._id },
                { toUserId: loggedInUser._id },
            ],
        }).select("fromUserId toUserId");

        const hideUsersFromFeed = new Set();
        connectionRequests.forEach((request) => {
            hideUsersFromFeed.add(request.fromUserId.toString());
            hideUsersFromFeed.add(request.toUserId.toString());
        });
        hideUsersFromFeed.add(loggedInUser._id.toString()); // never show my own card

        const users = await User.find({
            role: "alumni",
            _id: { $nin: Array.from(hideUsersFromFeed) },
        })
            .select(USER_SAVE_DATA)
            .sort({ createdAt: -1, _id: -1 }) // fixed order, newest alumni first
            .skip(skip)
            .limit(limit);

        res.send(users);
    }
    catch (err) {
        res.status(400).send("Error: " + err.message);
    }
});


// search alumni by name, company or job role
userRouter.get("/user/search", userAuth, async (req, res) => {
    try {
        const q = (req.query.q || "").trim().slice(0, 50);
        if (!q) return res.json({ data: [] });

        const rx = new RegExp(escapeRegex(q), "i");

        const users = await User.find({
            role: "alumni",
            _id: { $ne: req.user._id },
            $or: [
                { firstName: rx },
                { lastName: rx },
                { company: rx },
                { jobRole: rx },
            ],
        }).select(USER_SAVE_DATA).limit(20);

        res.json({ data: users });
    }
    catch (err) {
        res.status(400).send("Search failed");
    }
});


module.exports = userRouter;