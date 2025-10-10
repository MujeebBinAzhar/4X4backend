const express = require("express");
const router = express.Router();
const contactController = require("../controller/contactController");

router.post("/", contactController.submitMessage);
router.get("/", contactController.getMessages);
router.put("/:id/status", contactController.updateStatus);
router.delete("/:id", contactController.deleteMessage);

module.exports = router;
