const Newsletter = require("../models/newsletterModel");
const Joi = require("joi");

// Validation Schema
const newsletterSchema = Joi.object({
  email: Joi.string().email().required(),
});

// Subscribe to Newsletter
exports.subscribe = async (req, res) => {
  const { error } = newsletterSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const existing = await Newsletter.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ error: "Email already subscribed" });

    const subscriber = new Newsletter(req.body);
    await subscriber.save();
    res.status(201).json({ message: "Subscribed successfully", subscriber });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Unsubscribe from Newsletter
exports.unsubscribe = async (req, res) => {
  try {
    const result = await Newsletter.findOneAndDelete({ email: req.params.email });
    if (!result) return res.status(404).json({ error: "Email not found" });

    res.json({ message: "Unsubscribed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get All Subscribers
exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find();
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
