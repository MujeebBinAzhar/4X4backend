const Contact = require("../models/contactModel");
const Joi = require("joi");

// Validation Schema
const contactSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  message: Joi.string().min(5).required(),
  subject: Joi.string().required(),
  status: Joi.string().valid("Pending", "In Progress", "Resolved").default("Pending"),
});

// Submit Contact Form
exports.submitMessage = async (req, res) => {
  const { error } = contactSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: "Message submitted successfully", contact });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get All Messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await Contact.find();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update Message Status
exports.updateStatus = async (req, res) => {
  const { status } = req.body;

  if (!["Pending", "In Progress", "Resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const message = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) return res.status(404).json({ error: "Message not found" });

    res.json({ message: "Status updated successfully", updatedMessage: message });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete a Message
exports.deleteMessage = async (req, res) => {
  try {
    const result = await Contact.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Message not found" });

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
