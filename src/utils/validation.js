const validator = require("validator");

const validateSignupData = (req) => {
    const { firstName, lastName, emailId, password, role } = req.body;

    if (!firstName || !lastName) {
        throw new Error("User name is not Valid❗");
    }
    if (firstName.trim().length < 2 || firstName.trim().length > 50) {
        throw new Error("First name should be 2 to 50 characters ❗");
    }
    if (lastName.trim().length < 2 || lastName.trim().length > 50) {
        throw new Error("Last name should be 2 to 50 characters ❗");
    }
    if (!validator.isEmail(emailId || "")) {
        throw new Error("Please use a valid email address❗");
    }
    if (!validator.isStrongPassword(password || "")) {
        throw new Error("Please use a strong password❗");
    }
    if (!["junior", "alumni"].includes(role)) {
        throw new Error("Please choose a valid role❗");
    }

    const email = emailId.toLowerCase().trim();

    if (role === "alumni") {
        if (!email.endsWith("@gmail.com")) {
            throw new Error("Alumni must use a @gmail.com address❗");
        }
        if (!req.body.company || !req.body.company.trim()) {
            throw new Error("Company is required for alumni❗");
        }
        if (!req.body.jobRole || !req.body.jobRole.trim()) {
            throw new Error("Job role is required for alumni❗");
        }
    } else {
        if (!email.endsWith("@gmail.com") && !email.endsWith("@chitkara.edu.in")) {
            throw new Error("Use a @gmail.com or @chitkara.edu.in address❗");
        }
    }
};

// Pass the logged-in user's role (req.user.role) so alumni can edit their extra fields
const validateEditProfileData = (req) => {
    const commonFields = [
        "firstName", "lastName", "age", "gender", "about",
        "skills", "photoUrl", "branch", "batchYear",
    ];
    const alumniFields = ["company", "jobRole", "linkedinUrl"];

    const allowedEditFields =
        req.user && req.user.role === "alumni"
            ? [...commonFields, ...alumniFields]
            : commonFields;

    return Object.keys(req.body).every((field) => allowedEditFields.includes(field));
};

module.exports = {
    validateSignupData,
    validateEditProfileData,
};