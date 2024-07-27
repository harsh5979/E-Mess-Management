const express = require('express');
const authcontroller = require('../controllers/authcontroller');
const router = express.Router();
const middleware = require('../middleware/authmiddleware');
const authmiddleware = require("../middleware/authmiddleware");
const adminmiddleware = require("../middleware/adminmiddleware");



// Router:1  home page  get : "/auth/api/ " 
router.route("/").post(authcontroller.home);

// Router:2   login page  request post :"/auth/api/login"
router.route("/login").post(authcontroller.login);
router.route("/student/login").post(authcontroller.studentlogin);

// Router:3   get user   request post :"/auth/api/getuser"
router.post('/getuser',middleware, authcontroller.getuser);
router.post('/getStudentuser',middleware, authcontroller.getStudentuser);



module.exports = router; 