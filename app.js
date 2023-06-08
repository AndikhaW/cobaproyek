// Import required modules
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const path = require("path");
const multer = require("multer");

const app = express();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const router = express.Router();

// Configure the PostgreSQL connection
const pool = new Pool({
  host: "ep-summer-wildflower-276171.ap-southeast-1.aws.neon.tech",
  database: "proyeksbdnew",
  user: "andikha.wisanggeni",
  password: "VfWE7J1YRrqv",
  port: 5432,
  sslmode: "require",
  ssl: true,
});

pool.connect((err) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log("Database Connected");
});

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Create a storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads"); // specify the destination folder for storing the uploaded photo
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // generate a unique filename for the uploaded photo
  },
});

// Create an upload instance with the storage configuration
const upload = multer({ storage: storage });

// Middleware
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(expressLayouts);
app.use(fileUpload());
app.use(express.static("public"));
app.set("layout", "layout");
app.set("view engine", "ejs");
app.use("/", router);

function getUserFromSession(req) {
  return req.session.user;
}

function isAuthenticated(req, res, next) {
  const user = getUserFromSession(req); // You need to implement this function to retrieve the user object from the session or authentication middleware

  if (user) {
    req.user = user;
    next();
  } else {
    res.redirect("/login");
  }
}

// Homepage endpoint
router.get("/", async (req, res) => {
  if (req.session.user) {
    try {
      const query = `
              SELECT r.recipe_id, r.recipe_name, r.ingredients, r.steps, r.description, r.image, u.username
              FROM recipe r
              JOIN users u ON r.user_id = u.user_id
            `;
      const { rows: recipes } = await pool.query(query);
      console.log(recipes);
      res.render("home", { recipes, user: req.session.user });
    } catch (error) {
      console.error("Error retrieving recipes:", error);
      res.render("error", { error: "Failed to retrieve recipes" });
    }
  } else {
    // User is not authenticated, render the home template without passing the user object
    res.render("home");
  }
});

router.get("/home", async (req, res) => {
  if (req.session.user) {
    try {
      const query = `
          SELECT r.recipe_id, r.recipe_name, r.ingredients, r.steps, r.description, r.image, u.username
          FROM recipe r
          JOIN users u ON r.user_id = u.user_id
        `;
      const { rows: recipes } = await pool.query(query);
      console.log(recipes);
      res.render("home", { recipes, user: req.session.user });
    } catch (error) {
      console.error("Error retrieving recipes:", error);
      res.render("error", { error: "Failed to retrieve recipes" });
    }
  } else {
    // User is not authenticated, render the home template without passing the user object
    res.render("home");
  }
});

// Profile endpoint
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // Fetch user's recipes
    const recipes = await pool.query(
      "SELECT * FROM recipe WHERE user_id = $1",
      [userId]
    );

    res.render("profile", { user: req.session.user, recipes: recipes.rows });
  } catch (error) {
    console.error("Error retrieving user's recipes:", error);
    res.redirect("/"); // Redirect to homepage or error page
  }
});

// Registration  endpoint
router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  const { full_name, username, email, password } = req.body;
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the user data into the database
    await pool.query(
      "INSERT INTO users (full_name, username, email, password) VALUES ($1, $2, $3, $4)",
      [full_name, username, email, hashedPassword]
    );

    // Redirect to the login page or any other desired page
    req.session.user = {
      full_name,
      username,
      email,
    };
    res.redirect("/");
  } catch (error) {
    console.error("Error during registration:", error);
    // Handle the error and provide appropriate response to the user
    res.render("register", { error: "Registration failed. Please try again." });
  }
});

// Login endpoint
router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Find the user in the database based on their username
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];

    if (!user) {
      // User not found
      return res.render("login", { error: "Invalid username or password" });
    }

    // Compare the entered password with the stored encrypted password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Incorrect password
      return res.render("login", { error: "Invalid username or password" });
    }

    // Password is correct, set user information in session
    req.session.user = user;

    // Redirect to the homepage
    res.redirect("/");
  } catch (error) {
    console.error("Error during login:", error);
    // Handle the error and provide appropriate response to the user
    res.render("login", { error: "Login failed. Please try again." });
  }
});

router.get("/logout", (req, res) => {
  // Destroy the session and redirect to the home page
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      // Handle the error and provide appropriate response to the user
      res.render("error", { error: "Logout failed. Please try again." });
    } else {
      // Redirect to the home page
      res.redirect("/");
    }
  });
});

router.get("/addrecipe", async (req, res) => {
  res.render("addrecipe", { title: "OpenCookBook - Add Recipe" });
});

router.post("/addrecipe", async (req, res) => {
  try {
    let imagenew;
    let uploadpath;
    let imagename;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    } else {
      imagenew = req.files.image;
      imagename = imagenew.name;

      uploadpath =
        require("path").resolve("./") + "/public/uploads/" + imagename;

      imagenew.mv(uploadpath, function (err) {
        if (err) {
          return res.status(500).send(err);
        }
      });
    }

    const userId = req.session.user.user_id;

    const ingredients =
      req.body.ingredients instanceof Array ? req.body.ingredients : [];

    const steps = req.body.steps instanceof Array ? req.body.steps : [];

    const query = `
        INSERT INTO recipe (user_id, recipe_name, ingredients, steps, description, image)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING recipe_id;
      `;
    const values = [
      userId,
      req.body.name,
      ingredients,
      steps,
      req.body.description,
      imagename,
    ];

    const { rows } = await pool.query(query, values);
    const recipeId = rows[0].recipe_id;

    res.redirect("/");
  } catch (error) {
    console.log(error); // Log the error to the console
    res.status(500).send(`Error occurred: ${error.message}`); // Include the error message in the response
  }
});

router.get("/recipe/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    // Fetch the recipe from the database based on the recipeId
    const query = "SELECT * FROM recipe WHERE recipe_id = $1";
    const { rows } = await pool.query(query, [recipeId]);
    const recipe = rows[0];

    if (!recipe) {
      // Recipe not found
      res.render("error", { error: "Recipe not found" });
    } else {
      // Render the recipe details template and pass the recipe information
      res.render("recipe", { recipe });
    }
  } catch (error) {
    console.error("Error retrieving recipe details:", error);
    res.render("error", { error: "Failed to retrieve recipe details" });
  }
});

router.post("/recipe/delete", async (req, res) => {
  const { recipeIds } = req.body;

  try {
    // Check if recipeIds is an array
    if (!Array.isArray(recipeIds)) {
      return res.status(400).send("Invalid request");
    }

    // Delete the selected recipes based on their recipe_id
    const query = "DELETE FROM recipe WHERE recipe_id = ANY($1)";
    await pool.query(query, [recipeIds]);

    res.redirect("/profile");
  } catch (error) {
    console.error("Error deleting recipes:", error);
    res.render("error", { error: "Failed to delete recipes" });
  }
});

module.exports = router;

// Start the server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
