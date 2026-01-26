require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
// const http = require("http");
// const { Server } = require("socket.io");

const { connectDB } = require("../config/db");
const productRoutes = require("../routes/productRoutes");
const customerRoutes = require("../routes/customerRoutes");
const adminRoutes = require("../routes/adminRoutes");
const orderRoutes = require("../routes/orderRoutes");
const customerOrderRoutes = require("../routes/customerOrderRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const couponRoutes = require("../routes/couponRoutes");
const reviewRoutes = require("../routes/reviewRoute");
const siteReviewRoutes = require("../routes/shopReviews");
const shippingRatesRoute = require("../routes/shippingRateRoutes");
const seoRoutes = require("../routes/seoRoutes");
const attributeRoutes = require("../routes/attributeRoutes");
const settingRoutes = require("../routes/settingRoutes");
const currencyRoutes = require("../routes/currencyRoutes");
const languageRoutes = require("../routes/languageRoutes");
const notificationRoutes = require("../routes/notificationRoutes");
const brandRoutes = require("../routes/brandRoutes");
const siteBrandRoutes = require("../routes/siteBrandRoutes");
const siteProductsRoutes = require("../routes/siteProductsRoutes");
const siteCategoriesRoutes = require("../routes/siteCategoryRoutes");
const seoWebsiteRoutes = require("../routes/websiteSeoRoutes");
const seoWebsiteBlogs = require("../routes/websiteBlogRoutes");
const blogRoutesAdmin = require("../routes/blogRoutesAdmin");
const websiteBuilds = require("../routes/websiteGuestRoutes");
const adminBuilds = require("../routes/adminGuestRoutes");
const adminContactRoutes = require("../routes/adminContactRoutes");
const adminNewsletterRoutes = require("../routes/adminNewsletterRoutes");
const websiteContactRoutes = require("../routes/websiteContactRoutes");
const websiteNewsletterRoutes = require("../routes/websiteNewsletter");
const cbsgUserRoutes = require("../routes/cbsgUserRoutes");
const buildRoutes = require("../routes/buildRoutes");
const commentRoutes = require("../routes/commentRoutes");
const buildPostRoutes = require("../routes/buildPostRoutes");
const moderationRoutes = require("../routes/moderationRoutes");
const cbsgSettingsRoutes = require("../routes/cbsgSettingsRoutes");
const uploadRoutes = require("../routes/uploadRoutes");

const { isAuth, isAdmin } = require("../config/auth");
// const {
//   getGlobalSetting,
//   getStoreCustomizationSetting,
// } = require("../lib/notification/setting");

connectDB();
const app = express();

// We are using this for the express-rate-limit middleware
// See: https://github.com/nfriedly/express-rate-limit
// app.enable('trust proxy');
app.set("trust proxy", 1);

app.use(express.json({ limit: "4mb" }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.options("*", cors()); // include before other routes
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
}));

//root route
app.get("/", (req, res) => {
  res.send("App works properly!");
});

//this for route will need for store front, also for admin dashboard
app.use("/api/products/", productRoutes);
app.use("/api/category/", categoryRoutes);
app.use("/api/seo", isAuth, seoRoutes);
app.use("/api/coupon/", couponRoutes);
app.use("/api/review/", reviewRoutes);
app.use("/api/customer/", customerRoutes);
app.use("/api/order/", isAuth, orderRoutes);
app.use("/api/attributes/", attributeRoutes);
app.use("/api/setting/", settingRoutes);
app.use("/api/currency/", isAuth, currencyRoutes);
app.use("/api/language/", languageRoutes);
app.use("/api/notification/", isAuth, notificationRoutes);
app.use("/api/brand/", isAuth, brandRoutes);
app.use("/api/website/brands", siteBrandRoutes);
app.use("/api/website/products", siteProductsRoutes);
app.use("/api/website/categories", siteCategoriesRoutes);
app.use("/api/website/user", customerRoutes);
app.use("/api/website/order", customerOrderRoutes);
app.use("/api/website/reviews", siteReviewRoutes);
app.use("/api/shipping-rate-calculator", shippingRatesRoute);
app.use("/api/website/seo", seoWebsiteRoutes);
app.use("/api/website/blog", seoWebsiteBlogs);
app.use("/api/blog/", isAuth, blogRoutesAdmin); // Routes for admins

app.use("/api/website/build", websiteBuilds);
app.use("/api/build/", isAuth, adminBuilds); // Routes for admins
app.use("/api/admin/contact", adminContactRoutes);
app.use("/api/admin/newsletter", adminNewsletterRoutes);
app.use("/api/website/contact", websiteContactRoutes);
app.use("/api/website/newsletter", websiteNewsletterRoutes);
app.use("/api/website/setting", settingRoutes);

// CBSG (Customer Build & Social Garage) routes
app.use("/api/users", cbsgUserRoutes);
app.use("/api/builds", buildRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/posts", buildPostRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/settings/cbsg", cbsgSettingsRoutes);
app.use("/api/upload", uploadRoutes);

//if you not use admin dashboard then these two route will not needed.
app.use("/api/admin/", adminRoutes);
app.use("/api/orders/", orderRoutes);

// Serve static files from the "dist" directory
app.use("/static", express.static("public"));

// Serve uploaded images - MUST be before catch-all route
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
  setHeaders: (res, path) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

// Use express's default error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ message: err.message });
});

// Serve the index.html file for all routes (catch-all - must be last)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 5000;

// const server = http.createServer(app);

app.listen(PORT, () => console.log(`server running on port ${PORT}`));

// app.listen(PORT, () => console.log(`server running on port ${PORT}`));

// set up socket
// const io = new Server(server, {
//   cors: {
//     origin: [
//       "http://localhost:3000",
//       "http://localhost:4100",
//       "https://admin-kachabazar.vercel.app",
//       "https://dashtar-admin.vercel.app",
//       "https://kachabazar-store.vercel.app",
//       "https://kachabazar-admin.netlify.app",
//       "https://dashtar-admin.netlify.app",
//       "https://kachabazar-store-nine.vercel.app",
//     ], //add your origin here instead of this
//     methods: ["PUT", "GET", "POST", "DELETE", "PATCH", "OPTIONS"],
//     credentials: false,
//     transports: ["websocket"],
//   },
// });

// io.on("connection", (socket) => {
//   // console.log(`Socket ${socket.id} connected!`);

//   socket.on("notification", async (data) => {
//     console.log("data", data);
//     try {
//       let updatedData = data;

//       if (data?.option === "storeCustomizationSetting") {
//         const storeCustomizationSetting = await getStoreCustomizationSetting(
//           data
//         );
//         updatedData = {
//           ...data,
//           storeCustomizationSetting: storeCustomizationSetting,
//         };
//       }
//       if (data?.option === "globalSetting") {
//         const globalSetting = await getGlobalSetting(data);
//         updatedData = {
//           ...data,
//           globalSetting: globalSetting,
//         };
//       }
//       io.emit("notification", updatedData);
//     } catch (error) {
//       console.error("Error handling notification:", error);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log(`Socket ${socket.id} disconnected!`);
//   });
// });
// server.listen(PORT, () => console.log(`server running on port ${PORT}`));
