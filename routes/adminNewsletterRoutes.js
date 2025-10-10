const express = require("express");
const router = express.Router();
const newsletterController = require("../controller/newsletterController");

router.post("/subscribe", newsletterController.subscribe);
router.get("/", newsletterController.getSubscribers);
router.delete("/unsubscribe/:email", newsletterController.unsubscribe);

module.exports = router;
