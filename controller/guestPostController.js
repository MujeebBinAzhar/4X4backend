const GuestPost = require("../models/GuestPost");
const UserModel = require("../models/Customer");
const { accountCreated } = require("./emailController");
const addGuestPost = async (req, res) => {
  try {
    if(req.body.name && req.body.email) {
      console.log("inIf check")
      const password='$2a$12$MADNVFeTbavcce04VQw1B.CtJeWoJZhChqxT/NFcHRj3OdRHPb1UK'
      const user = await UserModel.findOne({email:req.body.email})
      console.log('dinf user', user)
      if(!user) {
        const newUser = new UserModel({
        name:req.body.name,
        email:req.body.email,
        password
      })
      newUser.save()
      req.body.userId= newUser._id
      accountCreated(newUser.email,newUser.name,'987654321')
      }else{
        req.body.userId= user?._id
      }
     
    }
    const newGuestPost = new GuestPost(req.body);
    await newGuestPost.save();
    res.send({
      message: "Guest Post Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: `Error occurred when adding guest post: ${err.message}`,
    });
  }
};

const getAllGuestPostsForAdmin = async (req, res) => {
  try {
    const guestPosts = await GuestPost.find();
    res.send(guestPosts);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getPublishedGuestPostsForWebsite = async (req, res) => {
  try {
        let guestPost=[]
        if(req.query?.userId){
guestPost= await GuestPost.find({ status: "published",userId:req.query?.userId  }).populate('userId');
        }
    else guestPost = await GuestPost.find({ status: "published",  }).populate('userId');
    res.send(guestPost);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getGuestPostById = async (req, res) => {
  try {
    const guestPost = await GuestPost.findById(req.params.id);
    res.send(guestPost);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateGuestPost = async (req, res) => {
  try {
    const guestPost = await GuestPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.send({
      message: "Guest Post updated successfully!",
      guestPost,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateGuestPostStatus = async (req, res) => {
  try {
    const newStatus = req.body.status;
    await GuestPost.updateOne(
      { _id: req.params.id },
      { $set: { status: newStatus } }
    );
    res.status(200).send({
      message: `Guest Post ${newStatus === "published" ? "Published" : "Unpublished"} Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteGuestPost = async (req, res) => {
  try {
    await GuestPost.deleteOne({ _id: req.params.id });
    res.send({
      message: "Guest Post Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyGuestPosts = async (req, res) => {
  try {
    await GuestPost.deleteMany({ _id: { $in: req.body.ids } });
    res.send({
      message: "Guest Posts Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addGuestPost,
  getAllGuestPostsForAdmin,
  getPublishedGuestPostsForWebsite,
  getGuestPostById,
  updateGuestPost,
  updateGuestPostStatus,
  deleteGuestPost,
  deleteManyGuestPosts,
};