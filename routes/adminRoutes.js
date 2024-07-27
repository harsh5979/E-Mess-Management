// routes/admin.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authmiddleware = require("../middleware/authmiddleware");
const adminmiddleware = require("../middleware/adminmiddleware");

// Login route
router.get("/login", adminController.getLoginPage);
router.post("/login", adminController.postLogin);

// Admin routes with required middlewares
router.get("/dashboard", authmiddleware, adminmiddleware, adminController.getAdminPage);
router.get("/add-student", authmiddleware, adminmiddleware, adminController.getAddStudentPage);
router.post("/add-student", authmiddleware, adminmiddleware, adminController.addStudent);
router.get("/view-student/:studentId", authmiddleware, adminmiddleware, adminController.getViewStudentPage);
router.delete("/delete-student/:studentId", authmiddleware, adminmiddleware, adminController.deleteStudent);
router.get("/add-monthly-fees", authmiddleware, adminmiddleware, adminController.getAddMonthlyFeesPage);
router.post("/add-monthly-fees", authmiddleware, adminmiddleware, adminController.addMonthlyFees);
router.delete("/delete-monthly-fees/:feeId", authmiddleware, adminmiddleware, adminController.deleteMonthlyFees);
router.get("/generate-report", authmiddleware, adminmiddleware, adminController.generateReport);
router.get("/download-all-students", authmiddleware, adminmiddleware, adminController.downloadAllStudents);
router.get("/download-basic-students", authmiddleware, adminmiddleware, adminController.downloadBasicStudents);
router.post("/mark-fee-as-paid/:studentId/:feeKey", authmiddleware, adminmiddleware, adminController.markFeeAsPaid);
router.get("/download-receipt/:studentId/:month/:year", authmiddleware, adminmiddleware, adminController.downloadReceipt);

module.exports = router;
