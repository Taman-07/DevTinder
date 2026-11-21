// const express=require('express');
// const authRouter=express.Router();


// const {validateSignupData} = require("../utils/validation");
// const User=require("../models/user");
// const bcrypt=require("bcrypt");
// const jwt=require("jsonwebtoken");


// authRouter.post("/signup", async (req,res) => {
//     const data=req.body;
//     try{
//         // validation of data
//         validateSignupData(req);

//         // encrypt the password 
//         const {firstName,lastName,emailId,password,age,gender,dateOfBirth,photoUrl,about,skills,} = req.body;

//         const passwordHash=await bcrypt.hash(password, 10);

//         // entering and saving the user
//         const user=new User({
//             firstName, 
//             lastName, 
//             emailId, 
//             password:passwordHash,
//             age, 
//             gender, 
//             dateOfBirth,
//             photoUrl,
//             about,
//             skills,
//         });
//         const savedUser = await user.save();

//         const token=await user.getJWT();

//         res.cookie("token", token, {expires: new Date(Date.now() + 8 * 60 * 60 * 1000)},);
        
//         res.json({message: "User Added Successfully❗😁", data: savedUser});
//     }
//     catch(err){
//         res.status(404).send("Error in saving user❗: " + " " + err.message);
//     }
// });

// authRouter.post("/login", async (req,res) =>{
//     try{
//         // VALIDATING 
//         const {emailId, password}=req.body;
        
//         const user=await User.findOne({emailId : emailId});

//         if(!user){
//             throw new Error("Invalid credentials❗")
//         }

//         const isPasswordValid=await user.validatePassword(password);


//         if(isPasswordValid){

//             // create a JWT Token 
//             const token=await user.getJWT();
    

//             // Add the token to cookie and res back to user 
//             res.cookie("token", token, {
//                 httpOnly: true,
//                 secure: true,
//                 sameSite: "none",
//                 expires: new Date(Date.now() + 8 * 3600000),
//             });
//             res.send(user);
//         }
//         else{
//             throw new Error("Invalid credentials❗");
//         }
//     }
//     catch(err){
//         res.status(404).send("Error in login user❗: " + err.message);
//     }
// });

// authRouter.post("/logout", async(req, res)=>{
//     res.cookie("token", null,{
//         expires: new Date(Date.now()),
//     });
//     res.send("Logout successfully❗");
// });




// module.exports=authRouter;


const express = require("express");
const authRouter = express.Router();

const { validateSignupData } = require("../utils/validation");
const User = require("../models/user");
const bcrypt = require("bcrypt");

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000),
};

// remove the password hash before sending the user to the frontend
const sanitizeUser = (user) => {
    const obj = user.toObject();
    delete obj.password;
    return obj;
};

authRouter.post("/signup", async (req, res) => {
    try {
        // validation of data
        validateSignupData(req);

        const {
            firstName,
            lastName,
            emailId,
            password,
            role,
            age,
            gender,
            dateOfBirth,
            photoUrl,
            about,
            skills,
            branch,
            batchYear,
        } = req.body;

        if (!["junior", "alumni"].includes(role)) {
            throw new Error("Please choose a valid role");
        }

        // alumni-only fields (ignored completely for juniors)
        const alumniData =
            role === "alumni"
                ? {
                      company: req.body.company,
                      jobRole: req.body.jobRole,
                      linkedinUrl: req.body.linkedinUrl,
                  }
                : {};

        // encrypt the password
        const passwordHash = await bcrypt.hash(password, 10);

        // entering and saving the user
        const user = new User({
            firstName,
            lastName,
            emailId,
            password: passwordHash,
            role,
            age,
            gender,
            dateOfBirth,
            photoUrl,
            about,
            skills,
            branch,
            batchYear,
            ...alumniData,
        });
        const savedUser = await user.save(); // model checks the email domain rule here

        const token = await user.getJWT();
        res.cookie("token", token, cookieOptions);

        res.json({
            message: "User Added Successfully❗😁",
            data: sanitizeUser(savedUser),
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).send("Error in saving user❗: This email is already registered");
        }
        res.status(400).send("Error in saving user❗: " + err.message);
    }
});

authRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({
            emailId: (emailId || "").toLowerCase().trim(),
        });

        if (!user) {
            throw new Error("Invalid credentials❗");
        }

        const isPasswordValid = await user.validatePassword(password);

        if (isPasswordValid) {
            const token = await user.getJWT();
            res.cookie("token", token, cookieOptions);
            res.send(sanitizeUser(user));
        } else {
            throw new Error("Invalid credentials❗");
        }
    } catch (err) {
        res.status(400).send("Error in login user❗: " + err.message);
    }
});

authRouter.post("/logout", async (req, res) => {
    res.cookie("token", null, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(Date.now()),
    });
    res.send("Logout successfully❗");
});

module.exports = authRouter;