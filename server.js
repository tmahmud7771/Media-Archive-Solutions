const express = require("express");
const fs = require("node:fs"); // Native file system module
const path = require("node:path");
const multer = require("multer");
const socketIo = require("socket.io");
const http = require("node:http");

const session = require("express-session");
const { users, authMiddleware, roleMiddleware } = require("./auth/auth.js");

const app = express();
const PORT = 3000;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "sdfsdfws324wfsdfsd23wfd", // Change this to a secure key
    resave: false,
    saveUninitialized: true,
  })
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size is too large. Maximum size is 8GB'
      });
    }
  }
  next(error);
});

app.use(express.json({limit: '8000mb'}));
app.use(express.urlencoded({limit: '8000mb', extended: true, parameterLimit: 50000}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let currentPath = req.body.currentPath || "";
    currentPath = currentPath.replace(/^\/+/, "");
    const folderPath = path.join(__dirname, "uploads", currentPath);

    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    } catch (err) {
      console.error("Error creating directory:", err);
      cb(new Error("Failed to set destination folder"));
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8000 * 1024 * 1024  // 8GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "video/mp4",
      "video/avi",
      "video/mkv",
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (
      file.originalname.endsWith(".mp4") ||
      file.originalname.endsWith(".avi") ||
      file.originalname.endsWith(".mkv") ||
      file.originalname.endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Only video (mp4, avi, mkv) and zip files are allowed!"),
        false
      );
    }
  },
});

app.post("/upload", roleMiddleware("admin"), (req, res) => {
  upload.single("videoFile")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (req.file) {
      const folderPath = req.body.currentPath || "";
      res.json({ success: true, redirectUrl: `/list-files/${folderPath}` });
    } else {
      res.status(400).json({ error: "File upload failed." });
    }
  });
});

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/list-files/");
  } else {
    res.render("login");
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username].password === password) {
    req.session.user = username;
    req.session.role = users[username].role;
    res.redirect("/list-files/");
  } else {
    res.redirect("/");
  }
});

app.post("/logout", authMiddleware, (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.post("/create-folder", roleMiddleware("admin"), (req, res) => {
  const { folderName, currentPath } = req.body; // Extract folder name and current path
  const folderPath = path.join(
    __dirname,
    "uploads",
    currentPath || "",
    folderName
  );

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  // Redirect back to the current directory to refresh the list
  const redirectPath = currentPath
    ? `/list-files/${currentPath}`
    : "/list-files/";
  res.redirect(redirectPath);
});

app.post("/delete-folder", roleMiddleware("admin"), (req, res) => {
  const folderPath = path.join(__dirname, "uploads", req.body.folderPath);

  // Check if the folder exists
  if (fs.existsSync(folderPath)) {
    // Remove the folder (and its contents)
    fs.rmdirSync(folderPath, { recursive: true });

    res.redirect(
      `/list-files/${
        req.body.folderPath.split("/").slice(0, -1).join("/") || ""
      }`
    );
  } else {
    res.send("Folder not found.");
  }
});

app.post("/delete-file", roleMiddleware("admin"), (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.body.filePath);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath); // Delete the file
      // console.log(`File deleted: ${filePath}`);
      res.redirect(
        `/list-files/${
          req.body.filePath.split("/").slice(0, -1).join("/") || ""
        }`
      );
    } catch (err) {
      // console.error(`Error deleting file: ${err.message}`);
      res.status(500).send("Error deleting file.");
    }
  } else {
    res.status(404).send("File not found.");
  }
});

app.get("/list-files/*", authMiddleware, (req, res) => {
  const folderPathParam = req.params[0] || ""; // Capture dynamic folder path; default to root (empty string)
  const folderPath = path.join(__dirname, "uploads", folderPathParam);

  if (fs.existsSync(folderPath)) {
    const items = fs.readdirSync(folderPath).map((item) => {
      const fullPath = path.join(folderPath, item);
      return {
        name: item,
        isFolder: fs.statSync(fullPath).isDirectory(),
      };
    });

    // Separate folders and files
    const folders = items
      .filter((item) => item.isFolder)
      .map((item) => ({
        name: item.name,
        path: folderPathParam ? `${folderPathParam}/${item.name}` : item.name,
        items: fs.readdirSync(path.join(folderPath, item.name)).length, // Count of items in the folder
      }));

    const fileItems = items.filter((item) => !item.isFolder);

    userinfo = {
      name: req.session.user,
      role: req.session.role,
    };

    res.render("index", {
      items: fileItems,
      folder: folderPathParam,
      folders: folders,
      user: userinfo,
    });
  } else {
    res.send("Folder not found.");
  }
});

app.post("/download-file", authMiddleware, (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.body.filePath);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Set headers to force download
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        // Check if the error is due to client cancellation
        if (err.code === "ECONNRESET" || err.code === "EPIPE") {
          console.log("Download was cancelled by the client");
          // Optionally, you can log the cancelled download
          res.end();
        } else {
          console.error("Download error:", err);
          if (!res.headersSent) {
            res.status(500).send("Error downloading file");
          }
        }
      }
    });

    // Handle request aborted (client cancelled)
    req.on("close", () => {
      console.log("Client aborted file download");
    });
  } else {
    res.status(404).send("File not found");
  }
});

app.post("/download-folder", authMiddleware, (req, res) => {
  const folderPath = path.join(__dirname, "uploads", req.body.folderPath);
  const archiver = require("archiver");

  if (fs.existsSync(folderPath)) {
    const zipFileName = `${path.basename(folderPath)}_${Date.now()}.zip`;
    const zipFilePath = path.join(__dirname, zipFileName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Get total size of files to be zipped
    let totalSize = 0;
    const walkSync = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkSync(filePath);
        } else {
          totalSize += stat.size;
        }
      });
    };
    walkSync(folderPath);

    let processedSize = 0;
    archive.on("entry", function (entry) {
      processedSize += entry.stats.size;
      const progress = (processedSize / totalSize) * 100;
      io.emit("zip-progress", {
        progress: Math.round(progress),
        fileName: zipFileName,
      });
    });

    archive.on("error", (err) => {
      console.error("Archiving error:", err);
      io.emit("zip-error", { error: "Error creating archive" });
      res.status(500).send("Error creating download archive");
    });

    output.on("close", () => {
      io.emit("zip-complete", { fileName: zipFileName });
      res.download(zipFilePath, zipFileName, (err) => {
        try {
          fs.unlinkSync(zipFilePath);
        } catch (cleanupErr) {
          console.error("Error cleaning up zip file:", cleanupErr);
        }

        if (err) {
          if (err.code === "ECONNRESET" || err.code === "EPIPE") {
            console.log("Folder download was cancelled by the client");
            res.end();
          } else {
            console.error("Download error:", err);
            if (!res.headersSent) {
              res.status(500).send("Error downloading folder");
            }
          }
        }
      });
    });

    req.on("close", () => {
      console.log("Client aborted folder download");
      archive.abort();
      try {
        fs.unlinkSync(zipFilePath);
      } catch (cleanupErr) {
        console.error("Error cleaning up zip file:", cleanupErr);
      }
    });

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  } else {
    res.status(404).send("Folder not found");
  }
});

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.use((req, res) => {
  if (!res.headersSent) {
    res.status(404).send("Page Not Found");
  }
});

// General error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (!res.headersSent) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
