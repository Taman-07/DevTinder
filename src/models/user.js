// const mongoose=require("mongoose");
// const validator=require("validator");
// const bcrypt=require("bcrypt");

// // const { userAuth } = require("../middlewares/auth");
// const { timeStamp } = require("node:console");
// const jwt = require("jsonwebtoken");

// const userSchema=mongoose.Schema({
//     firstName: {
//         type: String,
//         required:true,
//         minLength: 4,
//         maxLength: 50
//     },
//     lastName: {
//         type: String,
//         minLength: 2,
//         maxLength: 50
//     },
//     emailId: {
//         type: String,
//         lowercase: true,
//         trim: true,
//         // index: true, or
//         unique: true,
//         required: true,
//         minLength: 5,
//         maxLength: 30,
//         validate(value){
//             if(!validator.isEmail(value)){
//                 throw new Error("Please use a valid email address❗");
//             }
//         },
//     },
//     password: {
//         type: String,
//         required:true,
//         validate(value){
//             if(!validator.isStrongPassword(value)){
//                 throw new Error("Please use Strong Password❗");
//             }
//         },
//     },
//     age: {
//         type: Number,
//         default: 18,
//         min: 18,
//     },
//     gender: {
//         type: String,
//         enum: {
//             values: ["Male", "Female", "Other"],
//             message :`{VALUE} is not a valid gender type`,
//         },
//     },
//     dateOfBirth: {
//         type: Date,
//         validate(value){
//             if(value > new Date()){
//                 throw new Error("Date cannot be written for the future");
//             }
//         }
//     },
//     photoUrl: {
//         type: String,
//         default: "https://cdn-icons-png.flaticon.com/512/219/219969.png",
//         validate(value){
//             if(!validator.isURL(value)){
//                 throw new Error("Enter a valid Photo URL❗");
//             }
//         },
//     },
//     about: {
//         type: String,
//         default: "This is default description!"
//     },
//     skills: {
//         type: [String],
//         validate(value){
//             if(value.length>20){
//                 throw new Error("Too many Skills❗")
//             }
//         }
//     },
// }, 
// {
//     timestamps: true,
// });


// userSchema.methods.getJWT=async function() {
//     const user=this;
//     const token=await jwt.sign({_id : user._id}, "DEV@Tinder$790", {expiresIn : "1d"});
//     return token;
// };


// userSchema.methods.validatePassword=async function(passwordInputByUser){
//     const user=this;
//     const passwordHash=user.password;
//     const isPasswordValid=await bcrypt.compare(passwordInputByUser, passwordHash);
//     return isPasswordValid;
// };


// const User=mongoose.model("User", userSchema);

// module.exports=User;




const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 50,
    },
    emailId: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
      minLength: 5,
      maxLength: 100,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Please use a valid email address❗");
        }
      },
    },
    // Store the HASHED password here. Validate password strength in the signup route.
    password: {
      type: String,
      required: true,
    },

    // ---------- Role ----------
    role: {
      type: String,
      enum: {
        values: ["junior", "alumni"],
        message: "{VALUE} is not a valid role",
      },
      required: true,
    },

    // ---------- Alumni-only fields ----------
    company: {
      type: String,
      trim: true,
      maxLength: 80,
      required: function () {
        return this.role === "alumni";
      },
    },
    jobRole: {
      type: String,
      trim: true,
      maxLength: 80,
      required: function () {
        return this.role === "alumni";
      },
    },
    linkedinUrl: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !validator.isURL(value)) {
          throw new Error("Enter a valid LinkedIn URL❗");
        }
      },
    },

    // ---------- Common profile fields ----------
    branch: { type: String, trim: true, maxLength: 60 },
    batchYear: { type: Number, min: 2000, max: 2100 },
    age: { type: Number, min: 16 },
    gender: {
      type: String,
      enum: {
        values: ["Male", "Female", "Other"],
        message: `{VALUE} is not a valid gender type`,
      },
    },
    dateOfBirth: {
      type: Date,
      validate(value) {
        if (value > new Date()) {
          throw new Error("Date cannot be in the future");
        }
      },
    },
    photoUrl: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/219/219969.png",
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error("Enter a valid Photo URL❗");
        }
      },
    },
    about: {
      type: String,
      default: "Hi! I'm new here.",
      maxLength: 500,
    },
    skills: {
      type: [String],
      validate(value) {
        if (value.length > 20) {
          throw new Error("Too many Skills❗");
        }
      },
    },
  },
  {
    timestamps: true,
  }
);

// ---------- Validation hook ----------
userSchema.pre("validate", function () {
  // 1. Juniors cannot have alumni-only fields
  if (this.role === "junior") {
    this.company = undefined;
    this.jobRole = undefined;
    this.linkedinUrl = undefined;
  }

  // 2. Email domain rule per role
  if (this.role && (this.isModified("emailId") || this.isModified("role"))) {
    const email = (this.emailId || "").toLowerCase();
    const allowed =
      this.role === "alumni"
        ? email.endsWith("@gmail.com")
        : email.endsWith("@gmail.com") || email.endsWith("@chitkara.edu.in");

    if (!allowed) {
      return next(
        new Error(
          this.role === "alumni"
            ? "Alumni must use a @gmail.com address"
            : "Use a @gmail.com or @chitkara.edu.in address"
        )
      );
    }
  }
});

// ---------- Indexes for search ----------
userSchema.index({ role: 1, company: 1 });
userSchema.index({ firstName: 1, lastName: 1 });


userSchema.methods.getJWT=async function() {
    const user=this;
    const token=await jwt.sign({_id : user._id}, "DEV@Tinder$790", {expiresIn : "1d"});
    return token;
};


userSchema.methods.validatePassword=async function(passwordInputByUser){
    const user=this;
    const passwordHash=user.password;
    const isPasswordValid=await bcrypt.compare(passwordInputByUser, passwordHash);
    return isPasswordValid;
};


const User=mongoose.model("User", userSchema);

module.exports=User;