const express = require("express");
const router = express.Router();
const contactController = require("../controller/contactController");

router.post("/", contactController.submitMessage);

module.exports = router;
