const Student = require("../models/studentModel");
const MonthlyFees = require("../models/monthlyFeesModel");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const passport = require("passport");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.getLoginPage = (req, res) => {
  res.render("adminLogin", { message: req.flash("error") });
};

exports.postLogin = passport.authenticate("admin-local", {
  successRedirect: "/admin/dashboard",
  failureRedirect: "/admin/login",
  failureFlash: true,
});

exports.getAdminPage = async (req, res) => {
  try {
    const students = await Student.find({});
    const monthlyFees = await MonthlyFees.find({});

    const studentsWithPendingCount = students.map((student) => {
      const pendingMonthCount = Array.from(student.pendingFees.values()).filter(
        (isPending) => isPending
      ).length;
      return {
        ...student._doc,
        pendingMonthCount,
      };
    });

    res.status(200).json({
      students: studentsWithPendingCount,
      monthlyFees,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.getAddStudentPage = async (req, res) => {
  const student = Student.find({}, { password: 0 });
  const data = await student;
  res.json(data)

};

// add student.................
exports.addStudent = async (req, res) => {
  try {
    const {
      email,
      fullName,
      roomNumber,
      branch,
      batch,
      gender,
      mobileNumber,
      enrollmentNumber,
      username,
      password,
    } = req.body;


    // user exist check.........
    const userExist = await Student.findOne({ enrollmentNumber });
    if (userExist) {
      return res.status(400).json({ message: "this user  is already exist!!.." });
    }

    // hash password create....
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // create student.............
    const newStudent = await Student.create({
      email,
      fullName,
      roomNumber,
      branch,
      batch,
      gender,
      mobileNumber,
      enrollmentNumber,
      username,
      password: hashPassword,
    });
    res.status(200).json({ message: "successfully add student" });
  } catch (err) {
    console.error(err);
    res.status(500).json("Server Error");
  }
};

exports.getViewStudentPage = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    const monthlyFees = await MonthlyFees.find({});
    // Check if student data was found
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({ student, monthlyFees });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    // Find the student to delete
    const student = await Student.findById(req.params.studentId);

    if (!student) {
      console.error(`Student with ID ${req.params.studentId} not found`);
      return res.status(404).send("Student not found");
    }

    // Update pending fees count for each fee entry
    for (const [feeKey, isPending] of student.pendingFees.entries()) {
      if (isPending) {
        const [month, year] = feeKey.split(" ");
        const monthlyFees = await MonthlyFees.findOne({ month, year });

        if (monthlyFees) {
          monthlyFees.pendingCount = Math.max(0, monthlyFees.pendingCount - 1);
          await monthlyFees.save();
        } else {
          console.error(`MonthlyFees entry for ${month} ${year} not found`);
        }
      }
    }

    // Delete the student
    await Student.findByIdAndDelete(req.params.studentId);

    // res.redirect("/admin/dashboard");
    res.status(200).json({ message: "successfully Student deleted" })
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.getAddMonthlyFeesPage = async (req, res) => {
  try {
    const students = await Student.find({});
    const monthlyFees = await MonthlyFees.find({});

    // Calculate total pending amount for each month
    const feesWithPendingAmount = await Promise.all(
      monthlyFees.map(async (fee) => {
        const pendingAmount = fee.feeAmount * fee.pendingCount;

        return {
          ...fee.toObject(),
          pendingAmount,


        };
      })
    );

    // Calculate grand total of pending amount
    const grandTotal = feesWithPendingAmount.reduce(
      (total, fee) => total + fee.pendingAmount,
      0
    );

    // Get error message from query parameters if present
    const errorMessage = req.query.error || "";

    res.json({
      students,
      feesWithPendingAmount,
      grandTotal,
      errorMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.addMonthlyFees = async (req, res) => {
  const { month, year, feeAmount } = req.body;

  try {
    // Check if the monthly fees already exist
    const existingFees = await MonthlyFees.findOne({ month, year });

    if (existingFees) {
      return res.status(400).json({ message: "Fees for this month already exist" });
    }

    // Create new MonthlyFees entry
    const newMonthlyFees = new MonthlyFees({
      month,
      year,
      feeAmount,
      pendingCount: 0,
    });
    await newMonthlyFees.save();

    // Update all students with the new fee entry
    const students = await Student.find({});
    let pendingCount = 0;

    for (const student of students) {
      student.pendingFees.set(`${month} ${year}`, true);
      await student.save();
      pendingCount++;
    }

    // Update the newly created MonthlyFees with the count of students
    newMonthlyFees.pendingCount = pendingCount;
    await newMonthlyFees.save();

    res.status(200).json({ message: "successfully add-monthly-fees" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.markFeeAsPaid = async (req, res) => {
  try {
    const { studentId, feeKey } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
      console.error(`Student with ID ${studentId} not found`);
      return res.status(404).send("Student not found");
    }

    if (!student.pendingFees.has(feeKey)) {
      console.error(`FeeKey ${feeKey} not found in student's pendingFees`);
      return res.status(400).send("Fee not found for the student");
    }

    student.pendingFees.set(feeKey, false);
    const paymentDate = new Date();
    student.paymentDateTime.set(feeKey, paymentDate);
    await student.save();

    const [month, year] = feeKey.split(" ");
    const monthlyFees = await MonthlyFees.findOne({ month, year });
    if (monthlyFees) {
      monthlyFees.pendingCount = Math.max(0, monthlyFees.pendingCount - 1);
      await monthlyFees.save();
    } else {
      console.error(`MonthlyFees entry for ${month} ${year} not found`);
    }

    // Prepare email content
    const emailBody = `
      GEC - MODASA\n
      HOSTEL BLOCK - E\n
      MESS FEE PAYMENT RECEIPT\n\n

      Receipt Date: ${paymentDate.toLocaleDateString()} ${paymentDate.toLocaleTimeString()}\n
      Student Name: ${student.fullName}\n
      Room Number: ${student.roomNumber}\n
      Batch: ${student.batch}\n
      Branch: ${student.branch}\n
      Enrollment Number: ${student.enrollmentNumber}\n
      Mobile Number: ${student.mobileNumber}\n
      Paid Month: ${month} ${year}\n
      Amount Paid: ${monthlyFees.feeAmount}\n\n


      Received By: 
      Sawai Singh 
      (Hostel Mess Contractor)

      Thank you for your payment!\n
    `;

    // Send email with nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      port: 465,
      auth: {
        user: "resmit.dholariya.prsnl@gmail.com",
        pass: "ntri svco kmri sfwh",
      },
    });

    const mailOptions = {
      from: "RESMIT DHOLARIYA",
      to: student.email, // Use student's email
      subject: "Mess Fee Payment Receipt",
      text: emailBody,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).send("Error sending email");
      }
      console.log("Email sent:", info.response);
      res.status(200).json({message :"FeePaid succesfully.."});
    });
  } catch (err) {
    console.error("Error in markFeeAsPaid:", err);
    res.status(500).send("Server Error");
  }
};

exports.deleteMonthlyFees = async (req, res) => {
  const { feeId } = req.params;
  try {
    // Find the monthly fee entry
    const monthlyFee = await MonthlyFees.findById(feeId);

    if (!monthlyFee) {
      return res.status(404).json({ message: "Monthly fee not found" });
    }

    // Determine the fee key from the monthly fee entry
    const feeKey = `${monthlyFee.month} ${monthlyFee.year}`;

    // Remove the fee entry from each student's pendingFees map
    const students = await Student.find({});
    for (const student of students) {
      if (student.pendingFees.has(feeKey)) {
        student.pendingFees.delete(feeKey);
        await student.save();
      }
    }

    // Delete the monthly fee entry
    await MonthlyFees.findByIdAndDelete(feeId);

    res.status(200).json({ message: " monthly-fee deleted..." });
  } catch (err) {
    console.error("Error in deleteMonthlyFees:", err);
    res.status(500).send("Server Error");
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).send("Month and year are required");
    }

    // Fetch students who have pending fees for the specified month and year
    const students = await Student.find({});
    const pendingStudents = students.filter((student) =>
      student.pendingFees.get(`${month} ${year}`)
    );

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pending Fees Report");

    // Define and add title rows
    const titleRows = [
      "GOVERNMENT ENGINEERING COLLEGE MODASA",
      "HOSTEL BLOCK - E",
      "MESS FACILITY MONTHLY REPORT",
      `MONTH: ${month} ${year}`,
    ];

    const numColumns = 4; // Number of columns to merge

    titleRows.forEach((text, index) => {
      const row = worksheet.addRow([text]);
      row.font = { size: index < 4 ? 14 : 12, bold: index < 4 }; // Larger font size and bold for the first 4 rows
      row.alignment = { horizontal: "center", wrapText: true };
      worksheet.mergeCells(row.number, 1, row.number, numColumns); // Merge cells for title rows
    });

    // Add empty rows for spacing
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Add description row
    worksheet.addRow([
      "The following students are requested to pay the fees by the end of this month",
    ]);

    // Add another empty row
    worksheet.addRow([]);

    // Add table headers
    const headerRow = worksheet.addRow([
      "Full Name",
      "Room Number",
      "Batch",
      "Mobile Number",
    ]);

    // Style table header
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    pendingStudents.forEach((student) => {
      const row = worksheet.addRow([
        student.fullName,
        student.roomNumber,
        student.batch,
        student.mobileNumber,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Set column widths
    worksheet.columns = [
      { width: 40 }, // Wider width for "Full Name"
      { width: 15 },
      { width: 10 },
      { width: 20 },
    ];

    // Set response headers and write the file to the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${month}_${year}_pending_fees.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).send("Error generating report");
  }
};

exports.downloadAllStudents = async (req, res) => {
  try {
    const students = await Student.find({});

    if (!students.length) {
      return res.status(404).send("No student data available");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Student Details");

    // Define the title rows
    const titleRows = [
      "GOVERNMENT ENGINEERING COLLEGE MODASA",
      "HOSTEL BLOCK - E",
      "MESS FACILITY STUDENTS LIST",
    ];

    // Define the number of columns to merge for title rows
    const numColumns = 5; // Adjust based on your table width

    // Add title rows with merged columns
    titleRows.forEach((text, index) => {
      const row = worksheet.addRow([text]);
      row.font = { size: 14, bold: true }; // Larger text size and bold
      row.alignment = { horizontal: "center", wrapText: true };
      worksheet.mergeCells(row.number, 1, row.number, numColumns); // Merge columns for the title rows
    });

    // Add an empty row
    worksheet.addRow([]);

    // Add table headers
    worksheet.addRow([
      "Full Name",
      "Room Number",
      "Batch",
      "Mobile Number",
      "Pending Months",
    ]);

    // Style table header
    worksheet.getRow(5).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    students.forEach((student) => {
      const pendingMonthCount = Array.from(student.pendingFees.values()).filter(
        (isPending) => isPending
      ).length;

      const row = worksheet.addRow([
        student.fullName,
        student.roomNumber,
        student.batch,
        student.mobileNumber,
        pendingMonthCount,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Full Name
      { width: 15 }, // Room Number
      { width: 10 }, // Batch
      { width: 20 }, // Mobile Number
      { width: 15 }, // Pending Months
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=admin_dashboard_student_details.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating student details report:", error);
    res.status(500).send("Error generating student details report");
  }
};

exports.downloadBasicStudents = async (req, res) => {
  try {
    const students = await Student.find({});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Basic Student Details");

    // Define the title rows
    const titleRows = [
      "GOVERNMENT ENGINEERING COLLEGE MODASA",
      "HOSTEL BLOCK - E",
      "MESS FACILITY STUDENTS LIST",
    ];

    // Define the number of columns to merge for title rows
    const numColumns = 7; // Adjust based on your table width

    // Add title rows with merged columns
    titleRows.forEach((text, index) => {
      const row = worksheet.addRow([text]);
      row.font = { size: 14, bold: true }; // Larger text size and bold
      row.alignment = { horizontal: "center", wrapText: true };
      worksheet.mergeCells(row.number, 1, row.number, numColumns); // Merge columns for the title rows
    });

    // Add an empty row
    worksheet.addRow([]);

    // Add table headers
    worksheet.addRow([
      "Full Name",
      "Room Number",
      "Batch",
      "Extra Column 1",
      "Extra Column 2",
    ]);

    // Style table header
    worksheet.getRow(5).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    students.forEach((student) => {
      const row = worksheet.addRow([
        student.fullName,
        student.roomNumber,
        student.batch,
        "", // Placeholder for Extra Column 1
        "", // Placeholder for Extra Column 2
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Full Name
      { width: 15 }, // Room Number
      { width: 10 }, // Batch
      { width: 20 }, // Extra Column 1
      { width: 20 }, // Extra Column 2
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=basic_student_details.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating basic student details report:", error);
    res.status(500).send("Error generating basic student details report");
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { studentId, month, year } = req.params;
    const feeKey = `${month} ${year}`;
    const student = await Student.findById(studentId);

    if (!student) {
      console.error(`Student with ID ${studentId} not found`);
      return res.status(404).send("Student not found");
    }

    const paymentDate = student.paymentDateTime.get(feeKey);
    if (!paymentDate) {
      console.error(`Payment date not found for feeKey ${feeKey}`);
      return res.status(400).send("Payment date not found for the feeKey");
    }

    const monthlyFees = await MonthlyFees.findOne({ month, year });
    if (!monthlyFees) {
      console.error(`MonthlyFees entry for ${month} ${year} not found`);
      return res.status(400).send("Monthly fees entry not found");
    }

    // Generate and send receipt PDF
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${student.fullName.replace(
        /\s+/g,
        "_"
      )}_${Date.now()}.pdf`
    );
    doc.pipe(res);

    // Outer Page Border
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();

    // Header with Box Border
    doc.rect(50, 50, doc.page.width - 100, 100).stroke();
    doc
      .fillColor("#333")
      .fontSize(18)
      .text("GOVERNMENT ENGINEERING COLLEGE - MODASA", 50, 65, {
        align: "center",
        width: doc.page.width - 100,
      })
      .moveDown(0.5);
    doc
      .fontSize(16)
      .text("HOSTEL BLOCK - E", {
        align: "center",
        width: doc.page.width - 100,
      })
      .moveDown(0.5);
    doc
      .fontSize(16)
      .text("MESS FEE PAYMENT RECEIPT", {
        align: "center",
        width: doc.page.width - 100,
      })
      .moveDown(1);

    // Receipt Details
    doc.fontSize(12).fillColor("#000").moveDown(2);
    doc
      .text(
        `Receipt Date: ${paymentDate.toLocaleDateString()} ${paymentDate.toLocaleTimeString()}`,
        { align: "left", indent: 20 }
      )
      .moveDown(0.5);
    doc
      .text(`Student Name: ${student.fullName}`, { align: "left", indent: 20 })
      .moveDown(0.5);
    doc
      .text(`Room Number: ${student.roomNumber}`, { align: "left", indent: 20 })
      .moveDown(0.5);
    doc
      .text(`Batch: ${student.batch}`, { align: "left", indent: 20 })
      .moveDown(0.5);
    doc
      .text(`Branch: ${student.branch}`, { align: "left", indent: 20 })
      .moveDown(0.5);
    doc
      .text(`Enrollment Number: ${student.enrollmentNumber}`, {
        align: "left",
        indent: 20,
      })
      .moveDown(0.5);
    doc
      .text(`Email: ${student.email}`, { align: "left", indent: 20 })
      .moveDown(0.5);
    doc
      .text(`Mobile Number: ${student.mobileNumber}`, {
        align: "left",
        indent: 20,
      })
      .moveDown(0.5);
    doc
      .text(`Paid Month: ${month} ${year}`, { align: "left", indent: 20 })
      .moveDown(0.5);
    doc
      .text(`Amount Paid: ${monthlyFees.feeAmount}`, {
        align: "left",
        indent: 20,
      })
      .moveDown(2);

    // Footer
    doc
      .fillColor("#777")
      .fontSize(10)
      .text("Sawai Singh", 0, doc.page.height - 100, {
        align: "center",
        width: doc.page.width,
      })
      .fillColor("#777")
      .fontSize(10)
      .text("(Hostel Mess Contractor)", 0, doc.page.height - 85, {
        align: "center",
        width: doc.page.width,
      })
      .fillColor("#777")
      .fontSize(10)
      .text("Thank you for your payment!", 0, doc.page.height - 60, {
        align: "center",
        width: doc.page.width,
      });

    doc.end();
  } catch (err) {
    console.error("Error in downloadReceipt:", err);
    res.status(500).send("Server Error");
  }
};
