const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const knex = require("knex");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    database: "schoolmanagementsystem",
  },
});

const app = express();
// app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

 app.use(cors());

async function generateBcryptHash(password) {
  const saltRounds = 10;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    throw error;
  }
}
// generateBcryptHash("admin123").then((hash) => console.log(hash));

const generateAccessToken = (user) => {
  return jwt.sign({ email: user }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

async function comparePassword(userPassword, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(userPassword, hashedPassword);

    return isMatch;
  } catch (error) {
    throw error;
  }
}

const verify = (req, res, next) => {
  // const authHeader = req.headers.authorization;
  const accessToken = req.cookies.token;
  console.log(accessToken);
  if (accessToken) {
    // const token = authHeader.split(" ")[1];
    jwt.verify(accessToken, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json("Token not valid");
      }

      req.user = user;

      next();
      //  if (user.username === req.body.staffID) {
      //   req.user = user;
      //   next();
      // } else {
      //   res.status(403).json("Token does not match staffID");
      // }
    });
  } else {
    res.status(401).json("Not Authenticated");
  }
};

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.select("email", "hash", "role")
    .from("logins")
    .where("email", "=", email)
    .then((data) => {
      if (data.length === 0) {
        return res.status(401).json("Wrong Email");
      }

      comparePassword(password, data[0].hash)
        .then((isMatch) => {
          if (isMatch) {
            const accessToken = generateAccessToken(email);

            res.cookie("token", accessToken, {
              secure: false, // set to true if your using https
              httpOnly: true,
              maxAge: 24 * 60 * 60 * 1000,
              sameSite: "lax",
            });
            res.status(200).json({
              email: data[0].email,
              role: data[0].role,
            });
          } else {
            return res.json({ message: "Authentication failed" });
          }
        })
        .catch((error) => {
          console.log(error);
          res.status(500).json({ message: "Server error" });
        });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    });
});

app.post("/api/add-academic-year", (req, res) => {
  const { AcademicYear } = req.body;
  console.log(AcademicYear);
  db("academic_year")
    .insert({
      academic_year: AcademicYear,
    })
    .then((row) => {
      res.status(200).json("Added");
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/add-class", (req, res) => {
  const { ClassName } = req.body;

  db("classes")
    .insert({
      class_name: ClassName,
      // section: Section,
    })
    .then((row) => {
      res.status(200).json("Added");
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/add-marks", (req, res) => {
  const {
    StudentName,
    StudentId,
    SubjectName,
    ClassScore,
    ExamsScore,
    TotalScore,
    Grade,
    AcademicaYear,
    Term,
    Class,
  } = req.body;

  db("exams")
    .insert({
      student_name: StudentName,
      subject: SubjectName,
      class: Class,
      student_id: StudentId,
      class_score: ClassScore,
      exams_score: ExamsScore,
      total_score: TotalScore,
      grades: Grade,
      academic_year: AcademicaYear,
      term: Term,
    })
    .then((row) => {
      res.status(200).json("Added");
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/promote-student", (req, res) => {
  const {
    ID,

    Class,
  } = req.body;

  if (Class === "ALUMNI") {
    db("students")
      .update({
        alumni: true,
      })
      .where({
        id: ID,
      })
      .then((row) => {
        res.status(200).json("Promoted");
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      });
  } else {
    db("students")
      .update({
        class: Class,
      })
      .where({
        id: ID,
      })
      .then((row) => {
        res.status(200).json("Promoted");
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      });
  }
});

app.post("/api/add-expense-type", (req, res) => {
  const { ExpenseType } = req.body;

  db("expense_type")
    .insert({
      expense_type: ExpenseType,
      // section: Section,
    })
    .then((row) => {
      res.status(200).json("Added");
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/add-teacher", (req, res) => {
  const {
    FirstName,
    MiddleName,
    LastName,
    Password,
    Email,
    PhoneNumber,
    JoiningDate,
    BirthDate,
    Gender,
    ClassName,
  } = req.body;

  generateBcryptHash(Password)
    .then((hash) => {
      db.transaction((trx) => {
        trx("teachers")
          .insert({
            first_name: FirstName,
            middle_name: MiddleName,
            last_name: LastName,
            joining_date: JoiningDate,
            birth_date: BirthDate,
            phone_number: PhoneNumber,
            email: Email,
            gender: Gender,
            hash: hash,
            class: ClassName,
          })
          .returning("email")
          .then((insertedEmail) => {
            return trx("logins")
              .insert({
                email: insertedEmail[0].email,
                hash: hash,
                role: "teacher", // Assuming the role is 'teacher'
              })
              .then(() => {
                trx.commit();
                res.status(200).json("Added");
              })
              .catch((error) => {
                trx.rollback();
                console.log(error);
                res.status(500).json({ error: "Internal server error" });
              });
          })
          .catch((error) => {
            console.log(error);
            res.status(500).json({ error: "Internal server error" });
          });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/add-student", (req, res) => {
  const {
    FirstName,
    MiddleName,
    LastName,
    Gender,
    Languages,
    Address,
    BirthDate,
    ClassName,
    FatherName,
    FatherOccupation,
    FatherContact,
    MotherName,
    MotherOccupation,
    MotherContact,
  } = req.body;

  db("students")
    .insert({
      first_name: FirstName,
      middle_name: MiddleName,
      last_name: LastName,
      birth_date: BirthDate,
      address: Address,
      languages: Languages,
      gender: Gender,
      class: ClassName,
      father_name: FatherName,
      father_occupation: FatherOccupation,
      father_contact: FatherContact,
      mother_name: MotherName,
      mother_occupation: MotherOccupation,
      mother_contact: MotherContact,
    })
    .then((row) => {
      res.status(200).json("Added");
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.get("/api/get-academic-years", (req, res) => {
  db.select("*")
    .from("academic_year")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post("/api/get-teacher-name", (req, res) => {
  const { Class } = req.body;
  db.select("first_name", "last_name")
    .from("teachers")
    .where({ class: Class })
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-classes", (req, res) => {
  db.select("*")
    .from("classes")
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-subjects", (req, res) => {
  db.select("*")
    .from("subjects")
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-teachers", (req, res) => {
  db.select("*")
    .from("teachers")
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-students", (req, res) => {
  db.select("*")
    .from("students")
    .where({ status: "active", alumni: false })
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-alumni-students", (req, res) => {
  db.select("*")
    .from("students")
    .where({ alumni: true })
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-in-active-students", (req, res) => {
  db.select("*")
    .from("students")
    .where({ status: "inactive", alumni: false })
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post("/api/get-teacher-students", (req, res) => {
  const { Class } = req.body;
  if (Class === "All") {
    db.select("*")
      .from("students")
      .where({ status: "active", alumni: false })
      .orderBy("id")
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } else {
    db.select("*")
      .from("students")
      .where({ status: "active", class: Class, alumni: false })
      .orderBy("id")
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }
});

app.post("/api/get-teacher-alumni-students", (req, res) => {
  const { Class } = req.body;
  if (Class === "All") {
    db.select("*")
      .from("students")
      .where({ alumni: true })
      .orderBy("id")
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } else {
    db.select("*")
      .from("students")
      .where({ alumni: true, class: Class })
      .orderBy("id")
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }
});

app.post("/api/get-teacher-in-active-students", (req, res) => {
  const { Class } = req.body;
  if (Class === "All") {
    db.select("*")
      .from("students")
      .where({ status: "inactive", alumni: false })
      .orderBy("id")
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } else {
    db.select("*")
      .from("students")
      .where({ status: "inactive", class: Class, alumni: false })
      .orderBy("id")
      .then((rows) => {
        res.json(rows);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }
});

app.get("/api/get-fees", (req, res) => {
  db.select("*")
    .from("fees_collections")
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/get-expenses", (req, res) => {
  db.select("*")
    .from("expenses")
    .orderBy("id")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.get("/api/expense-types", (req, res) => {
  db.select("*")
    .from("expense_type")
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post("/api/get-sections", (req, res) => {
  const { ClassId } = req.body;
  const parsedID = parseInt(ClassId);
  db.select("section")
    .from("classes")
    .where({ id: parsedID })
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post("/api/submit-fee-payment", (req, res) => {
  const { StudentId, FeeType, Amount, AcademicYear, Term } = req.body;

  const parsedAmount = parseFloat(Amount);
  const parsedID = parseInt(StudentId);

  db.select("first_name", "last_name", "gender", "class")
    .from("students")
    .where({ id: parsedID })
    .then((studentDetails) => {
      if (studentDetails.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      const {
        first_name,
        last_name,
        gender,
        class: student_class,
        id,
      } = studentDetails[0];

      db("fees_collections")
        .insert({
          first_name,
          last_name,
          gender,
          class: student_class,
          fee_type: FeeType,
          amount: parsedAmount,
          academic_year: AcademicYear,
          term: Term,
          student_id: parsedID,
          // Add more fields as needed
        })
        .returning("*")
        .then((collection) => {
          res
            .status(200)
            .json({ studentDetails: studentDetails[0], collection });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: "Error adding fee collection" });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post("/api/get-students-from-class", (req, res) => {
  const { ClassName } = req.body;

  db.select("*")
    .from("students")
    .where({ class: ClassName, alumni: false })
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.put("/api/edit-class", verify, (req, res) => {
  const { Id, Email, ClassName } = req.body;
  console.log(Email);
  if (req.user.email !== Email) {
    return res.status(403).json("Access forbidden");
  }
  const parsedID = parseInt(Id);

  // Recipient exists, proceed with the update query
  db("classes")
    .where({ id: parsedID })
    .update({
      class_name: ClassName,
    })
    .then((row) => {
      res.json("Updated Successful");
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json("Error");
    });
});

app.put("/api/delete-class", verify, (req, res) => {
  const { Id, Email } = req.body;
  console.log(Email);
  if (req.user.email !== Email) {
    return res.status(403).json("Access forbidden");
  }
  const parsedID = parseInt(Id);

  // Recipient exists, proceed with the update query
  db("classes")
    .where({ id: parsedID })
    .del()
    .then((row) => {
      res.json("Deleted Successful");
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json("Error");
    });
});

app.put("/api/delete-teacher", verify, async (req, res) => {
  const { Id, Email, TeacherEmail } = req.body;
  console.log(Email);
  if (req.user.email !== Email) {
    return res.status(403).json("Access forbidden");
  }
  const parsedID = parseInt(Id);

  try {
    // Use transactions to ensure atomicity
    await db.transaction(async (trx) => {
      // Delete from the "teachers" table
      await trx("teachers").where({ id: parsedID }).del();

      // Delete from the "logins" table
      await trx("logins").where({ email: TeacherEmail }).del();
    });

    res.json("Deleted Successfully");
  } catch (err) {
    console.log(err);
    res.status(500).json("Error");
  }
});

app.put("/api/delete-student", verify, async (req, res) => {
  const { Id, Email } = req.body;
  console.log(Email);
  if (req.user.email !== Email) {
    return res.status(403).json("Access forbidden");
  }
  const parsedID = parseInt(Id);

  try {
    // Use transactions to ensure atomicity
    await db.transaction(async (trx) => {
      // Delete from the "teachers" table
      await trx("students").where({ id: parsedID }).del();
    });

    res.json("Deleted Successfully");
  } catch (err) {
    console.log(err);
    res.status(500).json("Error");
  }
});

app.put("/api/edit-teacher", verify, async (req, res) => {
  const {
    Email,
    Id,
    FirstName,
    MiddleName,
    LastName,
    Gender,
    JoiningDate,
    BirthDate,
    TeacherEmail,
    PhoneNumber,
    ClassName,
    OldEmail,
  } = req.body;

  const trx = await db.transaction();

  try {
    console.log(Email);
    if (req.user.email !== Email) {
      return res.status(403).json("Access forbidden");
    }

    const parsedID = parseInt(Id);

    // Update teacher details within the transaction
    await trx("teachers").where({ id: parsedID }).update({
      first_name: FirstName,
      middle_name: MiddleName,
      last_name: LastName,
      gender: Gender,
      joining_date: JoiningDate,
      birth_date: BirthDate,
      email: TeacherEmail,
      phone_number: PhoneNumber,
      class: ClassName,
    });

    // Update login details within the same transaction
    await trx("logins").where({ email: OldEmail }).update({
      email: TeacherEmail,
    });

    // If everything succeeds, commit the transaction
    await trx.commit();

    res.json("Updated Successful");
  } catch (err) {
    // If any operation fails, rollback the transaction
    await trx.rollback();
    console.log(err);
    res.status(500).json("Error");
  }
});

app.put("/api/update-student", verify, async (req, res) => {
  const {
    Id,
    FirstName,
    MiddleName,
    LastName,
    Gender,
    BirthDate,
    Address,
    Languages,
    FatherName,
    FatherOccupation,
    FatherContact,
    MotherName,
    MotherOccupation,
    MotherContact,
  } = req.body;

  const trx = await db.transaction();

  try {
    // You may include additional verification logic here if needed

    const parsedID = parseInt(Id);

    // Update student details within the transaction
    await trx("students").where({ id: parsedID }).update({
      first_name: FirstName,
      middle_name: MiddleName,
      last_name: LastName,
      gender: Gender,
      birth_date: BirthDate,
      address: Address,
      languages: Languages,
      father_name: FatherName,
      father_occupation: FatherOccupation,
      father_contact: FatherContact,
      mother_name: MotherName,
      mother_occupation: MotherOccupation,
      mother_contact: MotherContact,
    });

    // If everything succeeds, commit the transaction
    await trx.commit();

    res.json("Updated Successful");
  } catch (err) {
    // If any operation fails, rollback the transaction
    await trx.rollback();
    console.error(err);
    res.status(500).json("Error");
  }
});

app.put("/api/update-marks", verify, async (req, res) => {
  const { Id, Subject, ClassScore, ExamScore, TotalScore, Grades } = req.body;

  const trx = await db.transaction();

  try {
    // You may include additional verification logic here if needed

    const parsedID = parseInt(Id);

    // Update student details within the transaction
    await trx("exams").where({ id: parsedID }).update({
      subject: Subject,
      class_score: ClassScore,
      exams_score: ExamScore,
      total_score: TotalScore,
      grades: Grades,
    });

    // If everything succeeds, commit the transaction
    await trx.commit();

    res.json("Updated Successful");
  } catch (err) {
    // If any operation fails, rollback the transaction
    await trx.rollback();
    console.error(err);
    res.status(500).json("Error");
  }
});

app.put("/api/deactivate-student", verify, async (req, res) => {
  const { Id } = req.body;

  const trx = await db.transaction();

  try {
    // You may include additional verification logic here if needed

    const parsedID = parseInt(Id);

    // Update student details within the transaction
    await trx("students").where({ id: parsedID }).update({
      status: "inactive",
    });

    // If everything succeeds, commit the transaction
    await trx.commit();

    res.json("Updated Successful");
  } catch (err) {
    // If any operation fails, rollback the transaction
    await trx.rollback();
    console.error(err);
    res.status(500).json("Error");
  }
});

app.put("/api/activate-student", verify, async (req, res) => {
  const { Id } = req.body;

  const trx = await db.transaction();

  try {
    // You may include additional verification logic here if needed

    const parsedID = parseInt(Id);

    // Update student details within the transaction
    await trx("students").where({ id: parsedID }).update({
      status: "active",
    });

    // If everything succeeds, commit the transaction
    await trx.commit();

    res.json("Updated Successful");
  } catch (err) {
    // If any operation fails, rollback the transaction
    await trx.rollback();
    console.error(err);
    res.status(500).json("Error");
  }
});

app.get("/api/get-current-academic-year", (req, res) => {
  db.select("*")
    .from("academic_year")
    .where({ status: "Active" })
    .then((rows) => {
      res.json(rows);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.put("/api/set-academic-year", (req, res) => {
  const { AcademicYear, Term } = req.body;
  db.transaction((trx) => {
    // Step 1: Update all records in academic_year to set status to "InActive"
    db("academic_year")
      .transacting(trx)
      .update({ status: "InActive" })
      .then((resp) => {
        // Step 2: Update the specific academic_year record with the provided AcademicYear and Term
        db("academic_year")
          .transacting(trx)
          .where({ id: AcademicYear })
          .update({ status: "Active", term: Term })
          .then((resp) => {
            // If both updates are successful, commit the transaction
            trx
              .commit()
              .then(() => {
                res.status(200).json("updated");
              })
              .catch((commitErr) => {
                res.status(500).json(commitErr);
              });
          })
          .catch((updateErr) => {
            // If there is an error in the second update, rollback the transaction
            trx.rollback();
            res.status(500).json(updateErr);
          });
      })
      .catch((err) => {
        // If there is an error in the first update, rollback the transaction
        trx.rollback();
        res.status(500).json(err);
      });
  }).catch((err) => {
    res.status(500).json(err);
  });
});

app.post("/api/add-expenses", async (req, res) => {
  const { ExpenseType, ItemName, ItemPrice, ItemQuantity, AcademicYear, Term } =
    req.body;

  const parsedPrice = parseFloat(ItemPrice);
  const parsedQty = parseInt(ItemQuantity);
  const parsedTotal = parsedPrice * parsedQty;

  const trx = await db.transaction();

  try {
    // Insert expense details within the transaction
    await trx("expenses").insert({
      expense_type: ExpenseType,
      item_name: ItemName,
      item_price: parsedPrice,
      item_qty: parsedQty,
      total: parsedTotal,
      academic_year: AcademicYear,
      term: Term,
    });

    // Retrieve current budget amount within the transaction
    const currentBudget = await trx("budget").select("amount").first();

    const currentAmount = currentBudget.amount;

    // Calculate new budget amount by subtracting the expense total
    const newBudgetAmount = parseFloat(currentAmount) - parseFloat(parsedTotal);

    // Update the database with the new budget amount within the transaction
    await trx("budget").update({ amount: newBudgetAmount });

    // If everything succeeds, commit the transaction
    await trx.commit();

    res.status(200).json("Added");
  } catch (error) {
    // If any operation fails, rollback the transaction
    await trx.rollback();
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/add-budget", async (req, res) => {
  const { BudgetAmount } = req.body;

  try {
    // Step 1: Retrieve current budget amount
    const currentBudget = await db("budget").select("amount").first();

    if (!currentBudget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const currentAmount = currentBudget.amount;

    // Step 2: Calculate new budget amount by adding BudgetAmount
    const newBudgetAmount =
      parseFloat(currentAmount) + parseFloat(BudgetAmount);

    // Step 3: Update database with the new budget amount
    await db("budget").update({ amount: newBudgetAmount });

    res.status(200).json({ message: "Budget updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/subtract-budget", async (req, res) => {
  const { BudgetAmount } = req.body;

  try {
    // Step 1: Retrieve current budget amount
    const currentBudget = await db("budget").select("amount").first();

    if (!currentBudget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const currentAmount = currentBudget.amount;

    // Step 2: Calculate new budget amount by adding BudgetAmount
    const newBudgetAmount =
      parseFloat(currentAmount) - parseFloat(BudgetAmount);

    // Step 3: Update database with the new budget amount
    await db("budget").update({ amount: newBudgetAmount });

    res.status(200).json({ message: "Budget updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/count-active-students", async (req, res) => {
  try {
    const activeStudentsCount = await db("students")
      .count("* as active_students_count")
      .where("status", "active")
      .first();

    res.json(activeStudentsCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/count-active-students-in-class", async (req, res) => {
  const { Class } = req.body;
  try {
    const activeStudentsCount = await db("students")
      .count("* as active_students_count")
      .where({ status: "active", class: Class })
      .first();

    res.json(activeStudentsCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/get-total-fees", async (req, res) => {
  try {
    const total = await db("fees_collections")
      .sum("amount")

      .first();

    res.json(total);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/filter-total-fees", async (req, res) => {
  const { AcademicYear, Term } = req.body;
  try {
    const total = await db("fees_collections")
      .sum("amount")
      .where({
        academic_year: AcademicYear,
        term: Term,
      })

      .first();

    res.json(total);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/count-active-teachers", async (req, res) => {
  try {
    const activeTeachersCount = await db("teachers")
      .count("* as active_teachers_count")
      .where("status", "active")
      .first();

    res.json(activeTeachersCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/get-budget-amount", async (req, res) => {
  try {
    const budgetAmount = await db("budget").select("amount").first();

    res.json(budgetAmount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/get-total-expenses", async (req, res) => {
  try {
    const totalExpenses = await db("expenses")
      .sum("total as totalExpenses")
      .first();

    res.json(totalExpenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/get-total-fees", async (req, res) => {
  try {
    const totalExpenses = await db("fees_collections")
      .sum("amount as totalFees")
      .first();

    res.json(totalExpenses);
    console.log(totalExpenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
    console.log(error);
  }
});

app.post("/api/get-teacher-info", (req, res) => {
  const { email } = req.body;

  db.select("first_name", "class", "id", "phone_number")
    .from("teachers")
    .where({ email: email })
    .then((teacherInfo) => {
      if (teacherInfo.length === 0) {
        res.status(404).json({ error: "Teacher not found" });
      } else {
        res.status(200).json(teacherInfo[0]);
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/add-teacher-attendance", (req, res) => {
  const { id, date, firstName, Class, PhoneNumber } = req.body;

  // Check if the entry exists in the teacher_attendance table for the provided ID and date
  db.select("*")
    .from("teacher_attendance")
    .where({ teacher_id: id, date: date })
    .then((rows) => {
      if (rows.length === 0) {
        // Entry doesn't exist, perform insert
        db.insert({
          teacher_id: id,
          date: date,
          teacher_name: firstName,
          class: Class,
          teacher_contact: PhoneNumber,
        })
          .into("teacher_attendance")
          .then(() => {
            // Fetch from the teacher_attendance table after insertion
            db.select("*")
              .from("teacher_attendance")
              .where({ teacher_id: id, date: date })
              .then((result) => {
                res.status(200).json(result);
              })
              .catch((err) => {
                console.log(err);
                res.status(500).json({ error: "Error fetching data" });
              });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Error inserting data" });
          });
      } else {
        // Entry already exists, fetch from the teacher_attendance table
        db.select("*")
          .from("teacher_attendance")
          .where({ teacher_id: id, date: date })
          .then((result) => {
            res.status(200).json(result);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Error fetching data" });
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.put("/api/submit-teacher-attendance", (req, res) => {
  const { id, date, status } = req.body;

  db("teacher_attendance")
    .where({ teacher_id: id, date: date })
    .update({
      status: status,
    })
    .then(() => {
      res.status(200).json({ message: "Attendance updated successfully" });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error updating attendance" });
    });
});

app.put("/api/submit-student-attendance", (req, res) => {
  const { Students } = req.body;

  // Loop through the Students array and update attendance for each student
  Students.forEach((student) => {
    const { student_id, status } = student;

    db("student_attendance")
      .where({ student_id: student_id }) // Assuming student_id matches the table's column name
      .update({
        status: status,
      })
      .then(() => {
        // You might want to handle success for each student here if needed
        console.log(`Attendance updated for student ${student_id}`);
      })
      .catch((err) => {
        console.log(err);
        // You might want to handle errors for each student here if needed
        console.error(`Error updating attendance for student ${student_id}`);
      });
  });

  // Send the response after attempting to update all students
  res.status(200).json({ message: "Attendance updated for all students" });
});

app.post("/api/get-teacher-attendance", (req, res) => {
  const { teacherId, date } = req.body;

  db.select("*")
    .from("teacher_attendance")
    .where({ teacher_id: teacherId, date: date })
    .then((attendance) => {
      if (attendance.length === 0) {
        res.status(200).json([]);
      } else {
        res.status(200).json(attendance);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error fetching attendance" });
    });
});

app.post("/api/get-students-attendance", (req, res) => {
  const {
    Class,

    date,
  } = req.body;

  db.select("*")
    .from("student_attendance")
    .where({ class: Class, date: date })
    .then((attendance) => {
      if (attendance.length === 0) {
        res.status(200).json([]);
      } else {
        res.status(200).json(attendance);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error fetching attendance" });
    });
});

app.post("/api/get-students-marks", (req, res) => {
  const { Class, AcademicYear, Term } = req.body;

  db.select("student_name", "student_id")
    .from("exams")
    .where({ class: Class, academic_year: AcademicYear, term: Term })
    .groupBy("student_name", "student_id")
    .then((attendance) => {
      if (attendance.length === 0) {
        res.status(200).json([]);
      } else {
        res.status(200).json(attendance);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error fetching attendance" });
    });
});

app.post("/api/filter-fees", (req, res) => {
  const { AcademicYear, Term } = req.body;

  db.select("*")
    .from("fees_collections")
    .where({ academic_year: AcademicYear, term: Term })
    .orderBy("id")
    .then((fees) => {
      if (fees.length === 0) {
        res.status(200).json([]);
      } else {
        res.status(200).json(fees);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error fetching fees" });
    });
});

app.post("/api/get-student-report", (req, res) => {
  const { StudentId, AcademicYear, Term } = req.body;

  db.select("*")
    .from("exams")
    .where({ student_id: StudentId, academic_year: AcademicYear, term: Term })

    .then((attendance) => {
      if (attendance.length === 0) {
        res.status(200).json([]);
      } else {
        res.status(200).json(attendance);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error fetching attendance" });
    });
});

app.post("/api/add-student-attendance", (req, res) => {
  const { Class, Students, date } = req.body;

  db.select("*")
    .from("student_attendance")
    .where({ class: Class, date: date })
    .then((rows) => {
      if (rows.length === 0) {
        const insertPromises = Students.map((student) => {
          return db
            .insert({
              student_id: student.id,
              student_name: `${student.first_name} ${student.last_name}`,
              class: student.class,
              father_contact: student.father_contact,
              date: date,
              status: "Absent",
            })
            .into("student_attendance");
        });

        Promise.all(insertPromises)
          .then(() => {
            db.select("*")
              .from("student_attendance")
              .where({ class: Class, date: date })
              .then((result) => {
                res.status(200).json(result);
              })
              .catch((err) => {
                console.log(err);
                res.status(500).json({ error: "Error fetching data" });
              });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Error inserting data" });
          });
      } else {
        db.select("*")
          .from("student_attendance")
          .where({ class: Class, date: date })
          .then((result) => {
            res.status(200).json(result);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Error fetching data" });
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/get-today-student-attendance-count", (req, res) => {
  const { CurrentDate } = req.body;

  db.count("*")
    .from("student_attendance")
    .where({ date: CurrentDate, status: "Present" })
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/get-today-student-attendance-count-in-class", (req, res) => {
  const { CurrentDate, Class } = req.body;

  db.count("*")
    .from("student_attendance")
    .where({ date: CurrentDate, status: "Present", class: Class })
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/get-today-teacher-attendance-count-in-class", (req, res) => {
  const { CurrentDate, Class } = req.body;

  db.count("*")
    .from("teacher_attendance")
    .where({ date: CurrentDate, status: "Present", class: Class })
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/get-today-teacher-attendance-count", (req, res) => {
  const { CurrentDate } = req.body;

  db.count("*")
    .from("teacher_attendance")
    .where({ date: CurrentDate, status: "Present" })
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/get-all-student-attendance", (req, res) => {
  const { CurrentDate } = req.body;

  db.select("*")
    .from("student_attendance")
    .where({ date: CurrentDate })
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/api/get-all-teachers-attendance", (req, res) => {
  const { CurrentDate } = req.body;

  db.select("*")
    .from("teacher_attendance")
    .where({ date: CurrentDate })
    .then((row) => {
      res.status(200).json(row);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    });
});

const secret = "sk_test_e798050023172bcda66b98b6178a9c97c9d59557";

app.post("/api/webhook", function (req, res) {
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash == req.headers["x-paystack-signature"]) {
    // Retrieve the request's body
    res.json("correct");
    const event = req.body;
    // Do something with event
    if (event && event.event === "transfer.success") {
      return res.json({ message: "Transfer successful" });
    }
  } else {
    console.log("Received headers:", req.headers);
    res.json("wrong");
  }
  // res.send(200);
});
app.listen(process.env.PORT || 3000);
