const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const authmiddleware = require("../middleware/authmiddleware");


router.get("/login", studentController.getLogin);
router.post("/login", studentController.postLogin);
router.get("/dashboard",authmiddleware, studentController.getDashboard);
router.get("/logout", studentController.logout);

module.exports = router;
