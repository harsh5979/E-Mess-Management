const User = require('../models/User');
const Student = require('../models/studentModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// register page .....
const home = async (req, res) => {
    try {
        const { username, password } = req.body;

        // user exist check.........
        const userExist = await User.findOne({ username });
        if (userExist) {
            return res.status(400).json({ message: "Email id is already exist!!.." });
        }
        // hash password create....
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // new user creating.......
        const usercreate = await User.create({ username, password: hashPassword });

        // jwt token creating
        const data = {
            usercreate: {
                id: usercreate.id,
                admin: usercreate.isadmin
            }
        }
        const authtoken = await jwt.sign(data, process.env.jwt_key);


        return res.status(200).json({ message: "Registation is successfull", authtoken })

    } catch (error) {
        return res.status(500).json({ message: "internal server error." });

    }
}
//logic of  login page 
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // check user exist or not 
        const userExist = await User.findOne({ username });
        if (!userExist) {
            return res.status(400).json({ error: "Please try to login with correct credentials" })

        }
        // comparePassword...
        const comparePassword = await bcrypt.compare(password, userExist.password);
        if (!comparePassword) {
            return res.status(400).json({ error: "Please try to login with correct password.." })

        }
        // jwt token creating
        const data = {
            usercreate: {
                id: userExist.id,
                admin: userExist.isadmin
            }
        }
        const authtoken = await jwt.sign(data, process.env.jwt_key);


        res.status(200).json({ message: "Login is successfull...", authtoken: authtoken });




    } catch (error) {
        return res.status(500).json({ message: "internal server error." });

    }
}
// student login
const studentlogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        // check user exist or not 
        const userExist = await Student.findOne({ username });
        if (!userExist) {
            return res.status(400).json({ error: "Please try to login with correct credentials" })

        }
        // comparePassword...
        const comparePassword = await bcrypt.compare(password, userExist.password);
        if (!comparePassword) {
            return res.status(400).json({ error: "Please try to login with correct password.." })

        }
        // jwt token creating
        const data = {
            usercreate: {
                id: userExist.id,
                admin: userExist.isadmin
            }
        }
        const authtoken = await jwt.sign(data, process.env.jwt_key);


        res.status(200).json({ message: "Login is successfull...", authtoken: authtoken });




    } catch (error) {
        return res.status(500).json({ message: "internal server error." });

    }
}

// get user data...
const getuser = async (req, res) => {


    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

const getStudentuser = async (req, res) => {


    try {


        const userId = req.user.id;
        const user = await Student.findById(userId).select('-password');

        if (!user) {
            res.status(400).json({ message: "user not found" });

        }

        return res.status(200).json(user)
    }
    catch (error) {

        return res.status(500).json({ message: "Internal server error" });
    }

}

module.exports = { home, login, getuser, studentlogin, getStudentuser };